import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { QuoteRecord, QuoteSummary } from '@coreloop/shared';
import type { QuoteStorage } from './storage.interface.js';

function toSummary(record: QuoteRecord): QuoteSummary {
  const { design, ...rest } = record;
  return { ...rest, elementCount: design?.count ?? 0 };
}

/**
 * Append-only JSON file store. Good enough for a low-volume "quotes inbox"
 * without standing up a database; writes are serialised through a single
 * promise chain so concurrent submissions cannot interleave and corrupt
 * the file (PM2 typically runs this as a single instance for that reason
 * — see ecosystem.config.cjs).
 */
export class JsonFileQuoteStorage implements QuoteStorage {
  private readonly filePath: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'quotes.json');
  }

  private async ensureFile(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await readFile(this.filePath, 'utf8');
    } catch {
      await writeFile(this.filePath, '[]\n', 'utf8');
    }
  }

  private async readAll(): Promise<QuoteRecord[]> {
    await this.ensureFile();
    const raw = await readFile(this.filePath, 'utf8');
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as QuoteRecord[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: QuoteRecord[]): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(records, null, 2) + '\n', 'utf8');
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    // swallow so one failed op doesn't wedge the queue for later ops
    this.queue = next.catch(() => undefined);
    return next;
  }

  insert(record: QuoteRecord): Promise<QuoteRecord> {
    return this.enqueue(async () => {
      const all = await this.readAll();
      all.push(record);
      await this.writeAll(all);
      return record;
    });
  }

  list(limit = 50): Promise<QuoteSummary[]> {
    return this.enqueue(async () => {
      const all = await this.readAll();
      return all
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(toSummary);
    });
  }

  getById(id: string): Promise<QuoteRecord | null> {
    return this.enqueue(async () => {
      const all = await this.readAll();
      return all.find((r) => r.id === id) ?? null;
    });
  }
}
