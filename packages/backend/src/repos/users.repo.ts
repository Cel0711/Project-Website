import type { CurrencyCode, PersonRef, PublicUser, UserRole, UserStatus } from '@coreloop/shared';
import { isoOf, isoOrNull, type Queryable, type Row } from '../db/types.js';

/** A user as stored, including the fields that must never leave the server. */
export interface UserRecord extends PublicUser {
  passwordHash: string;
  failedLogins: number;
  lockedUntil: Date | null;
}

const COLS =
  'id, email, username, full_name, company, phone, role, status, password_hash, currency, email_verified_at, must_change_password, failed_logins, locked_until, last_login_at, created_at';

export function mapUser(r: Row): UserRecord {
  return {
    id: r.id,
    email: r.email,
    username: r.username ?? null,
    fullName: r.full_name,
    company: r.company,
    phone: r.phone,
    role: r.role as UserRole,
    status: r.status as UserStatus,
    currency: r.currency as CurrencyCode,
    emailVerified: r.email_verified_at != null,
    mustChangePassword: !!r.must_change_password,
    createdAt: isoOf(r.created_at),
    lastLoginAt: isoOrNull(r.last_login_at),
    passwordHash: r.password_hash,
    failedLogins: r.failed_logins,
    lockedUntil: r.locked_until ?? null,
  };
}

export function toPublic(u: UserRecord): PublicUser {
  const { passwordHash: _h, failedLogins: _f, lockedUntil: _l, ...pub } = u;
  return pub;
}

export function toPerson(u: Pick<UserRecord, 'id' | 'fullName' | 'email' | 'company' | 'role'>): PersonRef {
  return { id: u.id, fullName: u.fullName, email: u.email, company: u.company, role: u.role };
}

export async function byId(q: Queryable, id: string): Promise<UserRecord | null> {
  const r = await q.query(`select ${COLS} from users where id = $1`, [id]);
  return r.rows[0] ? mapUser(r.rows[0]) : null;
}

export async function byEmail(q: Queryable, email: string): Promise<UserRecord | null> {
  const r = await q.query(`select ${COLS} from users where lower(email) = lower($1)`, [email]);
  return r.rows[0] ? mapUser(r.rows[0]) : null;
}

/** "Username or Email" on the sign-in form. */
export async function byIdentifier(q: Queryable, identifier: string): Promise<UserRecord | null> {
  const r = await q.query(`select ${COLS} from users where lower(email) = lower($1) or lower(username) = lower($1) limit 1`, [identifier]);
  return r.rows[0] ? mapUser(r.rows[0]) : null;
}

export async function usernameTaken(q: Queryable, username: string, exceptId?: string): Promise<boolean> {
  const r = await q.query('select 1 from users where lower(username) = lower($1) and ($2::uuid is null or id <> $2::uuid)', [username, exceptId ?? null]);
  return r.rows.length > 0;
}

export interface NewUser {
  email: string;
  username?: string | null;
  fullName: string;
  company?: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  passwordHash: string;
  currency: CurrencyCode;
  emailVerified: boolean;
  mustChangePassword?: boolean;
}

export async function insertUser(q: Queryable, u: NewUser): Promise<UserRecord> {
  const r = await q.query(
    `insert into users (email, username, full_name, company, phone, role, status, password_hash, currency, email_verified_at, must_change_password)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning ${COLS}`,
    [u.email, u.username ?? null, u.fullName, u.company ?? '', u.phone ?? '', u.role, u.status ?? 'active', u.passwordHash, u.currency, u.emailVerified ? new Date() : null, !!u.mustChangePassword],
  );
  return mapUser(r.rows[0]!);
}

export async function setPassword(q: Queryable, id: string, passwordHash: string, opts: { mustChange?: boolean; activate?: boolean } = {}): Promise<void> {
  await q.query(
    `update users set password_hash = $2, must_change_password = $3, failed_logins = 0, locked_until = null,
       status = case when $4 and status = 'pending' then 'active' else status end, updated_at = now() where id = $1`,
    [id, passwordHash, !!opts.mustChange, !!opts.activate],
  );
}

export async function markVerified(q: Queryable, id: string): Promise<void> {
  await q.query('update users set email_verified_at = coalesce(email_verified_at, now()), updated_at = now() where id = $1', [id]);
}

/** Counts a wrong password and locks the account for a while after too many in a row. */
export async function recordLoginFailure(q: Queryable, id: string, maxFailures = 8, lockMinutes = 15): Promise<void> {
  await q.query(
    `update users set failed_logins = failed_logins + 1,
       locked_until = case when failed_logins + 1 >= $2::int then now() + make_interval(mins => $3::int) else locked_until end
     where id = $1`,
    [id, maxFailures, lockMinutes],
  );
}

export async function recordLoginSuccess(q: Queryable, id: string): Promise<void> {
  await q.query('update users set failed_logins = 0, locked_until = null, last_login_at = now() where id = $1', [id]);
}

export interface ProfilePatch {
  fullName?: string;
  company?: string;
  phone?: string;
  currency?: CurrencyCode;
  username?: string | null;
  role?: UserRole;
  status?: UserStatus;
}

export async function updateUser(q: Queryable, id: string, p: ProfilePatch): Promise<UserRecord | null> {
  const sets: string[] = [];
  const vals: unknown[] = [id];
  const add = (col: string, v: unknown): void => {
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  };
  if (p.fullName !== undefined) add('full_name', p.fullName);
  if (p.company !== undefined) add('company', p.company);
  if (p.phone !== undefined) add('phone', p.phone);
  if (p.currency !== undefined) add('currency', p.currency);
  if (p.username !== undefined) add('username', p.username);
  if (p.role !== undefined) add('role', p.role);
  if (p.status !== undefined) add('status', p.status);
  if (!sets.length) return byId(q, id);
  const r = await q.query(`update users set ${sets.join(', ')}, updated_at = now() where id = $1 returning ${COLS}`, vals);
  return r.rows[0] ? mapUser(r.rows[0]) : null;
}

export async function listUsers(q: Queryable, f: { role?: string; status?: string; search?: string; limit?: number; offset?: number } = {}): Promise<{ users: UserRecord[]; total: number }> {
  const where: string[] = [];
  const vals: unknown[] = [];
  const param = (v: unknown): string => {
    vals.push(v);
    return `$${vals.length}`;
  };
  if (f.role) where.push(`role = ${param(f.role)}`);
  if (f.status) where.push(`status = ${param(f.status)}`);
  if (f.search) {
    const p = param(`%${f.search.replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(full_name ilike ${p} or email ilike ${p} or company ilike ${p} or coalesce(username, '') ilike ${p})`);
  }
  const cond = where.length ? `where ${where.join(' and ')}` : '';
  const total = await q.query<{ n: number }>(`select count(*) as n from users ${cond}`, vals);
  const rows = await q.query(`select ${COLS} from users ${cond} order by created_at desc limit ${Math.min(f.limit ?? 100, 500)} offset ${Math.max(f.offset ?? 0, 0)}`, vals);
  return { users: rows.rows.map(mapUser), total: total.rows[0]?.n ?? 0 };
}

export async function activeIdsByRole(q: Queryable, roles: UserRole[]): Promise<string[]> {
  const r = await q.query<{ id: string }>("select id from users where status = 'active' and role = any($1::text[])", [roles]);
  return r.rows.map((x) => x.id);
}

export async function countActiveAdmins(q: Queryable): Promise<number> {
  const r = await q.query<{ n: number }>("select count(*) as n from users where role = 'admin' and status = 'active'");
  return r.rows[0]?.n ?? 0;
}
