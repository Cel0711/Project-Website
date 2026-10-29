import { API_ROUTES, type CreateQuoteResponse, type QuoteRecord, type QuoteRequestPayload } from '@coreloop/shared';
import { api } from '../../api/client.js';

/**
 * Sends a quote request to the backend (packages/backend). The visitor must be signed in as a client; the
 * request is then stored against their account so they can follow its progress and message the team.
 *
 * Errors are thrown (ApiRequestError). The caller falls back to the email / copy / download routes in
 * fallback.ts when the server cannot be reached, so a failed send never loses what the visitor typed.
 */
export async function submitQuote(payload: QuoteRequestPayload): Promise<QuoteRecord> {
  const res = await api.post<CreateQuoteResponse>(API_ROUTES.quotes, payload);
  return res.quote;
}
