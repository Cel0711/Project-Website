import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/** A random URL-safe token for cookies and email links. Only its hash is ever stored. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** argon2id with the library defaults (19 MiB, 2 passes), which meet the current OWASP minimum. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | null = null;

/** Spends the same time as a real check, so "no such user" cannot be told apart from "wrong password" by timing. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummy ??= hashPassword(randomToken(16));
  await verifyPassword(await dummy, password);
}

const COMMON = new Set(
  ['password', 'password1', 'password123', '1234567890', '123456789012', 'qwertyuiop', 'qwerty123456', 'iloveyou123', 'letmein1234', 'welcome1234', 'admin12345', 'changeme123', 'passw0rd123', 'abcdefghij', '0123456789'],
);

/** Beyond the length rule in the shared schema: reject the most common passwords and anything built from the email. */
export function passwordProblem(password: string, email = ''): string | null {
  const p = password.toLowerCase();
  if (COMMON.has(p) || /^(.)\1+$/.test(p)) return 'That password is too easy to guess. Choose something longer or less common.';
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  if (local.length >= 4 && p.includes(local)) return 'Your password should not contain your email name.';
  return null;
}
