import type { PublicUser, SessionInfo } from '@coreloop/shared';
import type { z } from 'zod';
import type { registerSchema, updateProfileSchema } from '@coreloop/shared';
import type { Db } from '../db/types.js';
import { burnPasswordCheck, hashPassword, passwordProblem, randomToken, verifyPassword } from '../lib/crypto.js';
import { badRequest, conflict, HttpError, notFound, unauthorized } from '../lib/http-error.js';
import * as emails from './email-templates.js';
import type { Notifier } from './notifier.js';
import * as security from '../repos/security.repo.js';
import * as users from '../repos/users.repo.js';

export interface RequestMeta {
  ip: string;
  userAgent: string;
}

const WRONG = 'Wrong username/email or password.';

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly n: Notifier,
    private readonly sessionTtlDays: number,
  ) {}

  get emailEnabled(): boolean {
    return this.n.mailer.enabled;
  }

  private async openSession(userId: string, meta: RequestMeta): Promise<string> {
    const token = randomToken(32);
    await security.createSession(this.db, userId, token, this.sessionTtlDays, meta.userAgent, meta.ip);
    return token;
  }

  /** Client self-sign-up. Staff accounts are never created here. The new client is signed in straight away. */
  async register(input: z.output<typeof registerSchema>, meta: RequestMeta): Promise<{ user: PublicUser; token: string }> {
    const problem = passwordProblem(input.password, input.email);
    if (problem) throw badRequest(problem, { issues: [`password: ${problem}`] });
    if (await users.byEmail(this.db, input.email)) throw conflict('An account with this email already exists. Try signing in.');

    const passwordHash = await hashPassword(input.password);
    const user = await this.db.tx(async (q) => {
      const u = await users.insertUser(q, {
        email: input.email,
        fullName: input.fullName,
        company: input.company,
        phone: input.phone,
        role: 'client',
        passwordHash,
        currency: input.currency,
        // With no mail server there is no way to check an address, so it is accepted as given.
        emailVerified: !this.emailEnabled,
      });
      await security.audit(q, { actorId: u.id, action: 'auth.register', entity: 'user', entityId: u.id, ip: meta.ip });
      return u;
    });
    if (this.emailEnabled) await this.sendVerification(user);
    return { user: users.toPublic(user), token: await this.openSession(user.id, meta) };
  }

  async login(identifier: string, password: string, meta: RequestMeta): Promise<{ user: PublicUser; token: string }> {
    const user = await users.byIdentifier(this.db, identifier);
    if (!user) {
      await burnPasswordCheck(password);
      throw unauthorized(WRONG);
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new HttpError(429, 'Too many sign-in attempts. Please wait a few minutes and try again.', { code: 'locked' });
    }
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      if (user.status === 'active') await users.recordLoginFailure(this.db, user.id);
      throw unauthorized(WRONG);
    }
    // Right password but not allowed in (disabled, or an invite that was never accepted): same answer as a wrong password.
    if (user.status !== 'active') throw unauthorized(WRONG);

    await users.recordLoginSuccess(this.db, user.id);
    const token = await this.openSession(user.id, meta);
    return { user: users.toPublic({ ...user, lastLoginAt: new Date().toISOString() }), token };
  }

  async logout(sessionId: string): Promise<void> {
    await security.deleteSession(this.db, sessionId);
  }

  private async sendVerification(user: users.UserRecord): Promise<void> {
    const token = await security.createEmailToken(this.db, user.id, 'verify', 48);
    await this.n.email(user.email, emails.verifyEmail({ company: this.n.company, name: user.fullName, url: this.n.url(`/verify/${token}`) }));
  }

  async resendVerification(user: PublicUser): Promise<void> {
    if (user.emailVerified || !this.emailEnabled) return;
    const rec = await users.byId(this.db, user.id);
    if (rec) await this.sendVerification(rec);
  }

  async verifyEmail(token: string): Promise<void> {
    const t = await security.consumeEmailToken(this.db, token, ['verify']);
    if (!t) throw badRequest('This link has expired or was already used.', { code: 'bad_token' });
    await users.markVerified(this.db, t.userId);
  }

  /** Always resolves, whether or not the address has an account, so the form cannot be used to find out who is registered. */
  async forgot(email: string): Promise<void> {
    if (!this.emailEnabled) return;
    const u = await users.byEmail(this.db, email);
    if (!u || u.status === 'disabled') return;
    const token = await security.createEmailToken(this.db, u.id, 'reset', 1);
    await this.n.email(u.email, emails.resetPassword({ company: this.n.company, name: u.fullName, url: this.n.url(`/reset/${token}`) }));
  }

  async remind(email: string): Promise<void> {
    if (!this.emailEnabled) return;
    const u = await users.byEmail(this.db, email);
    if (!u || u.status === 'disabled') return;
    await this.n.email(u.email, emails.usernameReminder({ company: this.n.company, name: u.fullName, username: u.username, email: u.email, url: this.n.loginUrl() }));
  }

  /** Completes a reset or an invite: sets the password, confirms the email (they just proved they own it) and signs out everywhere. */
  async resetPassword(token: string, password: string, ip = ''): Promise<void> {
    const t = await security.consumeEmailToken(this.db, token, ['reset', 'invite']);
    if (!t) throw badRequest('This link has expired or was already used.', { code: 'bad_token' });
    const u = await users.byId(this.db, t.userId);
    if (!u) throw notFound();
    const problem = passwordProblem(password, u.email);
    if (problem) throw badRequest(problem, { issues: [`password: ${problem}`] });
    const passwordHash = await hashPassword(password);
    await this.db.tx(async (q) => {
      await users.setPassword(q, u.id, passwordHash, { activate: true });
      await users.markVerified(q, u.id);
      await security.deleteUserSessions(q, u.id);
      await security.audit(q, { actorId: u.id, action: t.purpose === 'invite' ? 'auth.invite_accepted' : 'auth.password_reset', entity: 'user', entityId: u.id, ip });
    });
  }

  async changePassword(user: PublicUser, sessionId: string | undefined, current: string, next: string, ip = ''): Promise<void> {
    const rec = await users.byId(this.db, user.id);
    if (!rec || !(await verifyPassword(rec.passwordHash, current))) throw badRequest('Your current password is not right.', { issues: ['currentPassword: Your current password is not right.'] });
    const problem = passwordProblem(next, rec.email);
    if (problem) throw badRequest(problem, { issues: [`newPassword: ${problem}`] });
    const passwordHash = await hashPassword(next);
    await this.db.tx(async (q) => {
      await users.setPassword(q, rec.id, passwordHash);
      await security.deleteUserSessions(q, rec.id, sessionId);
      await security.audit(q, { actorId: rec.id, action: 'auth.password_changed', entity: 'user', entityId: rec.id, ip });
    });
  }

  async updateProfile(userId: string, patch: z.output<typeof updateProfileSchema>): Promise<PublicUser> {
    if (patch.username && (await users.usernameTaken(this.db, patch.username, userId))) throw conflict('That username is taken.');
    const u = await users.updateUser(this.db, userId, patch);
    if (!u) throw notFound();
    return users.toPublic(u);
  }

  sessions(userId: string, currentId?: string): Promise<SessionInfo[]> {
    return security.listSessions(this.db, userId, currentId);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const mine = await security.listSessions(this.db, userId);
    if (!mine.some((s) => s.id === sessionId)) throw notFound();
    await security.deleteSession(this.db, sessionId);
  }
}
