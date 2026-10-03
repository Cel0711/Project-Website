import { randomUUID } from 'node:crypto';
import {
  quoteRequestPayloadSchema,
  type QuoteRecord,
  type QuoteRequestPayloadInput,
  type QuoteSummary,
} from '@coreloop/shared';
import type { QuoteStorage } from '../storage/storage.interface.js';
import { logger } from '../utils/logger.js';

export class ValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join('; '));
    this.name = 'ValidationError';
  }
}

export class QuotesService {
  constructor(private readonly storage: QuoteStorage) {}

  async create(input: QuoteRequestPayloadInput): Promise<QuoteRecord> {
    const parsed = quoteRequestPayloadSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    }
    const record: QuoteRecord = {
      ...parsed.data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const saved = await this.storage.insert(record);
    logger.info('quote received', {
      id: saved.id,
      email: saved.email,
      plan: saved.planName,
      hasDesign: !!saved.design,
      elements: saved.design?.count ?? 0,
    });
    return saved;
  }

  list(limit?: number): Promise<QuoteSummary[]> {
    return this.storage.list(limit);
  }

  getById(id: string): Promise<QuoteRecord | null> {
    return this.storage.getById(id);
  }
}
