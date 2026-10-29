import type { PublicUser } from '@coreloop/shared';
import type { z } from 'zod';
import type { createStaffSchema, updateUserSchema } from '@coreloop/shared';
import { DEFAULT_CURRENCY } from '@coreloop/shared';
import type { Db } from '../db/types.js';
import { hashPassword, randomToken } from '../lib/crypto.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/http-error.js';
import * as emails from './email-templates.js';
import type { Notifier } from './notifier.js';
import * as security from '../repos/security.repo.js';
import * as users from '../repos/users.repo.js';

export interface StaffCreated {
  user: PublicUser;
  /** Only when the server cannot send email: shown once to the Admin, who passes it on. The user must change it at first sign-in. */
  tempPassword?: string;
}

/** Admin-side account management: invite Admin / Finance staff, change roles, disable, reset passwords. */
export class UsersService {
  constructor(
    private readonly db: Db,
    private readonly n: Notifier,
  ) {}

  async list(f: { role?: string; status?: string; search?: string; limit?: number; offset?: number }): Promise<{ users: PublicUser[]; total: number }> {
    const r = await users.listUsers(this.db, f);
    return { users: r.users.map(users.toPublic), total: r.total };
  }

  /** A short list of clients for pickers (new invoice, start a conversation). */
  async clientDirectory(search?: string): Promise<{ id: string; fullName: string; email: string; company: string; currency: string }[]> {
    const r = await users.listUsers(this.db, { role: 'client', status: 'active', search, limit: 200 });
    return r.users.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, company: u.company, currency: u.currency }));
  }

  async createStaff(actor: PublicUser, input: z.output<typeof createStaffSchema>, ip = ''): Promise<StaffCreated> {
    if (await users.byEmail(this.db, input.email)) throw conflict('An account with this email already exists.');
    let username: string | null = input.username ?? null;
    if (username && (await users.usernameTaken(this.db, username))) throw conflict('That username is taken.');
    if (!username) {
      const guess = input.email.split('@')[0]!.replace(/[^a-zA-Z0-9._-]/g, '');
      username = guess.length >= 3 && !(await users.usernameTaken(this.db, guess)) ? guess : null;
    }
    const mail = this.n.mailer.enabled;
    const temp = mail ? null : randomToken(12);
    const passwordHash = await hashPassword(temp ?? randomToken(32));
    const created = await this.db.tx(async (q) => {
      const u = await users.insertUser(q, {
        email: input.email,
        username,
        fullName: input.fullName,
        role: input.role,
        // With email: an invite they accept by choosing a password. Without: active now, temporary password, change at first sign-in.
        status: mail ? 'pending' : 'active',
        passwordHash,
        currency: DEFAULT_CURRENCY,
        emailVerified: !mail,
        mustChangePassword: !mail,
      });
      await security.audit(q, { actorId: actor.id, action: 'user.create', entity: 'user', entityId: u.id, meta: { role: u.role, email: u.email }, ip });
      return u;
    });
    if (mail) {
      const token = await security.createEmailToken(this.db, created.id, 'invite', 24 * 7);
      await this.n.email(created.email, emails.invite({ company: this.n.company, name: created.fullName, role: created.role, url: this.n.url(`/invite/${token}`) }));
    }
    return { user: users.toPublic(created), ...(temp ? { tempPassword: temp } : {}) };
  }

  async update(actor: PublicUser, id: string, patch: z.output<typeof updateUserSchema>, ip = ''): Promise<PublicUser> {
    const target = await users.byId(this.db, id);
    if (!target) throw notFound();
    if (id === actor.id && (patch.role && patch.role !== target.role)) throw forbidden('You cannot change your own role.');
    if (id === actor.id && patch.status === 'disabled') throw forbidden('You cannot disable your own account.');
    const losesAdmin = target.role === 'admin' && target.status === 'active' && ((patch.role && patch.role !== 'admin') || patch.status === 'disabled');
    if (losesAdmin && (await users.countActiveAdmins(this.db)) <= 1) throw badRequest('There must always be at least one active Admin.');
    const updated = await this.db.tx(async (q) => {
      const u = await users.updateUser(q, id, patch);
      if (patch.status === 'disabled') await security.deleteUserSessions(q, id);
      await security.audit(q, { actorId: actor.id, action: 'user.update', entity: 'user', entityId: id, meta: patch as Record<string, unknown>, ip });
      return u;
    });
    if (!updated) throw notFound();
    return users.toPublic(updated);
  }

  /** Emails a reset link, or (no mail server) sets a temporary password and returns it once. */
  async resetPassword(actor: PublicUser, id: string, ip = ''): Promise<{ tempPassword?: string }> {
    const target = await users.byId(this.db, id);
    if (!target) throw notFound();
    if (this.n.mailer.enabled) {
      const token = await security.createEmailToken(this.db, id, target.status === 'pending' ? 'invite' : 'reset', target.status === 'pending' ? 24 * 7 : 1);
      const path = target.status === 'pending' ? `/invite/${token}` : `/reset/${token}`;
      await this.n.email(target.email, emails.resetPassword({ company: this.n.company, name: target.fullName, url: this.n.url(path) }));
      await security.audit(this.db, { actorId: actor.id, action: 'user.reset_link', entity: 'user', entityId: id, ip });
      return {};
    }
    const temp = randomToken(12);
    const passwordHash = await hashPassword(temp);
    await this.db.tx(async (q) => {
      await users.setPassword(q, id, passwordHash, { mustChange: true, activate: true });
      await security.deleteUserSessions(q, id);
      await security.audit(q, { actorId: actor.id, action: 'user.temp_password', entity: 'user', entityId: id, ip });
    });
    return { tempPassword: temp };
  }
}
