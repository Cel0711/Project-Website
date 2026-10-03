import type { QuoteRecord, QuoteSummary } from '@coreloop/shared';
import type { QuoteStorage } from './storage.interface.js';

function toSummary(record: QuoteRecord): QuoteSummary {
  const { design, ...rest } = record;
  return { ...rest, elementCount: design?.count ?? 0 };
}

/** Process-memory only — resets on restart. Useful for tests and local dev. */
export class MemoryQuoteStorage implements QuoteStorage {
  private records: QuoteRecord[] = [];

  async insert(record: QuoteRecord): Promise<QuoteRecord> {
    this.records.push(record);
    return record;
  }

  async list(limit = 50): Promise<QuoteSummary[]> {
    return this.records
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(toSummary);
  }

  async getById(id: string): Promise<QuoteRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }
}
