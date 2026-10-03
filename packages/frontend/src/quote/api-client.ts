import { API_ROUTES, type CreateQuoteResponse, type QuoteRecord, type QuoteRequestPayload } from '@coreloop/shared';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Posts a quote request to the backend (packages/backend, run under PM2).
 * This is the replacement for the old single-file site's optional
 * "wire it to your own backend" fetch snippet and its claude.ai-only
 * db hook — here it is first-class and always attempted.
 *
 * Deliberately non-throwing: the email/copy/download fallbacks in
 * quote/fallback.ts are the paths that always work, on every host, with
 * no backend required, so a failed POST here must never block the visitor.
 */
export async function submitQuote(payload: QuoteRequestPayload): Promise<QuoteRecord | null> {
  try {
    const res = await fetch(`${API_BASE}${API_ROUTES.quotes}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as CreateQuoteResponse;
    return body.ok ? body.quote : null;
  } catch {
    return null;
  }
}
