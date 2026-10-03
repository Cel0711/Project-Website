import { env } from '../config/env.js';
import { JsonFileQuoteStorage } from './json-file.storage.js';
import { MemoryQuoteStorage } from './memory.storage.js';
import type { QuoteStorage } from './storage.interface.js';

export function createStorage(): QuoteStorage {
  if (env.storageDriver === 'memory') return new MemoryQuoteStorage();
  return new JsonFileQuoteStorage(env.dataDir);
}

export type { QuoteStorage } from './storage.interface.js';
