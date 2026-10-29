import type { CurrencyCode } from './currency.js';

export const USER_ROLES = ['admin', 'finance', 'client'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** `pending` = invited staff member who has not set a password yet. */
export const USER_STATUSES = ['active', 'pending', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** The signed-in user as the browser sees it (never includes the password hash). */
export interface PublicUser {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  company: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  currency: CurrencyCode;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/** A short reference to a person, used inside quotes, messages and invoices. */
export interface PersonRef {
  id: string;
  fullName: string;
  email?: string;
  company?: string;
  role?: UserRole;
}

export interface AuthResponse {
  ok: true;
  /** null from GET /api/auth/me when nobody is signed in. */
  user: PublicUser | null;
  /** True when the server can send email, so the UI knows Forgot / Remind me / verification really work. */
  emailEnabled: boolean;
}

export interface SessionInfo {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface ListUsersResponse {
  ok: true;
  users: PublicUser[];
}
