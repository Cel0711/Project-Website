import type { QuoteRecord, QuoteSummary } from './quote.js';

/** Single source of truth for backend route roots, imported by both sides. */
export const API_ROUTES = {
  health: '/api/health',
  auth: '/api/auth',
  me: '/api/me',
  quotes: '/api/quotes',
  quoteById: (id: string): string => `/api/quotes/${encodeURIComponent(id)}`,
  admin: '/api/admin',
  conversations: '/api/conversations',
  events: '/api/events',
  notifications: '/api/notifications',
  invoices: '/api/invoices',
  finance: '/api/finance',
} as const;

export interface ApiError {
  ok: false;
  error: string;
  /** Field-level messages from validation, e.g. "email: A valid email is required". */
  issues?: string[];
  /** Machine-readable hint such as "must_change_password" or "email_not_verified". */
  code?: string;
}

export interface HealthResponse {
  ok: true;
  service: 'coreloop-api';
  uptimeSeconds: number;
  db?: 'up' | 'down';
}

export interface CreateQuoteResponse {
  ok: true;
  quote: QuoteRecord;
}

export interface ListQuotesResponse {
  ok: true;
  quotes: QuoteSummary[];
  total: number;
}

export interface GetQuoteResponse {
  ok: true;
  quote: QuoteRecord;
}

export type ApiResult<T> = T | ApiError;
