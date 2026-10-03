import type { QuoteRecord, QuoteSummary } from '@coreloop/shared';

/**
 * Storage is behind an interface on purpose: the default json-file driver
 * is enough to run this for real with zero external services, but swapping
 * in Postgres/Mongo/whatever later means writing one adapter, not touching
 * the routes or the service layer.
 */
export interface QuoteStorage {
  insert(record: QuoteRecord): Promise<QuoteRecord>;
  list(limit?: number): Promise<QuoteSummary[]>;
  getById(id: string): Promise<QuoteRecord | null>;
}
