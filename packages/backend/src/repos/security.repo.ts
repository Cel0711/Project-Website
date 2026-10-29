import type { SessionInfo } from '@coreloop/shared';
import { randomToken, sha256 } from '../lib/crypto.js';
import { isoOf, type Queryable, type Row } from '../db/types.js';
import { mapUser, type UserRecord } from './users.repo.js';

/* ---------- login sessions ---------- */

export async function createSession(q: Queryable, userId: string, token: string, ttlDays: number, userAgent: string, ip: string): Promise<string> {
  const r = await q.query<{ id: string }>(
    `insert into sessions (user_id, token_hash, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, now() + make_interval(days => $5::int)) returning id`,
    [userId, sha256(token), userAgent.slice(0, 300), ip.slice(0, 64), ttlDays],
  );
  return r.rows[0]!.id;
}

export interface LiveSession {
  id: string;
  lastSeenAt: Date;
  user: UserRecord;
}

/** Looks up a cookie token. Expired sessions and disabled users never match. */
export async function findSession(q: Queryable, token: string): Promise<LiveSession | null> {
  const r = await q.query(
    `select s.id as session_id, s.last_seen_at, u.*
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.status = 'active'`,
    [sha256(token)],
  );
  const row: Row | undefined = r.rows[0];
  if (!row) return null;
  return { id: row.session_id, lastSeenAt: row.last_seen_at, user: mapUser(row) };
}

/** Slides the expiry forward. Callers only do this every few minutes, not on every request. */
export async function touchSession(q: Queryable, id: string, ttlDays: number): Promise<void> {
  await q.query('update sessions set last_seen_at = now(), expires_at = now() + make_interval(days => $2::int) where id = $1', [id, ttlDays]);
}

export async function deleteSession(q: Queryable, id: string): Promise<void> {
  await q.query('delete from sessions where id = $1', [id]);
}

/** Signs a user out everywhere, optionally keeping the session they are using right now. */
export async function deleteUserSessions(q: Queryable, userId: string, exceptId?: string): Promise<void> {
  await q.query('delete from sessions where user_id = $1 and ($2::uuid is null or id <> $2::uuid)', [userId, exceptId ?? null]);
}

export async function listSessions(q: Queryable, userId: string, currentId?: string): Promise<SessionInfo[]> {
  const r = await q.query('select id, user_agent, ip, created_at, last_seen_at from sessions where user_id = $1 and expires_at > now() order by last_seen_at desc', [userId]);
  return r.rows.map((s) => ({ id: s.id, userAgent: s.user_agent, ip: s.ip, createdAt: isoOf(s.created_at), lastSeenAt: isoOf(s.last_seen_at), current: s.id === currentId }));
}

export async function purgeExpiredSessions(q: Queryable): Promise<void> {
  await q.query('delete from sessions where expires_at < now()');
  await q.query("delete from email_tokens where expires_at < now() - interval '7 days'");
}

/* ---------- one-time email links (verify, reset, invite) ---------- */

export type TokenPurpose = 'verify' | 'reset' | 'invite';

/** Creates a link token and returns the raw value to put in the email. Older unused tokens of that purpose stop working. */
export async function createEmailToken(q: Queryable, userId: string, purpose: TokenPurpose, ttlHours: number): Promise<string> {
  await q.query('update email_tokens set used_at = now() where user_id = $1 and purpose = $2 and used_at is null', [userId, purpose]);
  const token = randomToken(32);
  await q.query(
    'insert into email_tokens (user_id, purpose, token_hash, expires_at) values ($1, $2, $3, now() + make_interval(hours => $4::int))',
    [userId, purpose, sha256(token), ttlHours],
  );
  return token;
}

/** Marks the token used and returns whose it was, or null when it is unknown, used or expired. */
export async function consumeEmailToken(q: Queryable, token: string, purposes: TokenPurpose[]): Promise<{ userId: string; purpose: TokenPurpose } | null> {
  const r = await q.query<{ user_id: string; purpose: TokenPurpose }>(
    `update email_tokens set used_at = now()
      where token_hash = $1 and purpose = any($2::text[]) and used_at is null and expires_at > now()
      returning user_id, purpose`,
    [sha256(token), purposes],
  );
  const row = r.rows[0];
  return row ? { userId: row.user_id, purpose: row.purpose } : null;
}

/* ---------- audit trail ---------- */

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}

export async function audit(q: Queryable, e: AuditEntry): Promise<void> {
  await q.query('insert into audit_log (actor_id, action, entity, entity_id, meta, ip) values ($1, $2, $3, $4, $5, $6)', [
    e.actorId,
    e.action,
    e.entity ?? '',
    e.entityId ?? '',
    JSON.stringify(e.meta ?? {}),
    (e.ip ?? '').slice(0, 64),
  ]);
}
