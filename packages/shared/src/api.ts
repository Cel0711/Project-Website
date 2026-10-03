import type { QuoteRecord, QuoteRequestPayload, QuoteSummary } from './quote.js';

/** Single source of truth for backend route paths, imported by both sides. */
export const API_ROUTES = {
  health: '/api/health',
  quotes: '/api/quotes',
  quoteById: (id: string): string => `/api/quotes/${encodeURIComponent(id)}`,
} as const;

export interface ApiError {
  ok: false;
  error: string;
}

export interface HealthResponse {
  ok: true;
  service: 'coreloop-api';
  uptimeSeconds: number;
}

export interface CreateQuoteRequest {
  quote: QuoteRequestPayload;
}

export interface CreateQuoteResponse {
  ok: true;
  quote: QuoteRecord;
}

export interface ListQuotesResponse {
  ok: true;
  quotes: QuoteSummary[];
}

export interface GetQuoteResponse {
  ok: true;
  quote: QuoteRecord;
}

export type ApiResult<T> = T | ApiError;
