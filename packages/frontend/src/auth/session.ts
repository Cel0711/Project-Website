import type { AuthResponse, PublicUser } from '@coreloop/shared';
import { api } from '../api/client.js';

/** Who is signed in. Shared by the landing site and the portal; the truth always lives on the server (the cookie). */
let current: AuthResponse = { ok: true, user: null, emailEnabled: false };
let loaded: Promise<AuthResponse> | null = null;
const listeners = new Set<(s: AuthResponse) => void>();

function set(s: AuthResponse): AuthResponse {
  current = s;
  listeners.forEach((fn) => fn(s));
  return s;
}

/** Asks the server once (or again with `force`). A server that cannot be reached counts as "nobody signed in". */
export function loadSession(force = false): Promise<AuthResponse> {
  if (!loaded || force) {
    loaded = api
      .get<AuthResponse>('/api/auth/me')
      .catch((): AuthResponse => ({ ok: true, user: null, emailEnabled: current.emailEnabled }))
      .then(set);
  }
  return loaded;
}

export function currentUser(): PublicUser | null {
  return current.user;
}

/** True when the server can send email (verification, Forgot, Remind me really work). */
export function emailEnabled(): boolean {
  return current.emailEnabled;
}

export function onSession(fn: (s: AuthResponse) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setSession(s: AuthResponse): void {
  loaded = Promise.resolve(s);
  set(s);
}

export async function signOut(): Promise<void> {
  try {
    await api.post('/api/auth/logout', {});
  } catch {
    /* the cookie may already be gone; either way this browser is signed out below */
  }
  setSession({ ok: true, user: null, emailEnabled: current.emailEnabled });
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
