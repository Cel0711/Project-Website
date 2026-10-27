import 'dotenv/config';

export type StorageDriver = 'json-file' | 'memory';

export interface AppEnv {
  port: number;
  corsOrigins: string[];
  storageDriver: StorageDriver;
  dataDir: string;
  notifyEmail: string;
  /** Bearer token required on the admin (list/read) quote routes. Unset = those routes are disabled. */
  adminToken: string | null;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseStorageDriver(raw: string | undefined): StorageDriver {
  return raw === 'memory' ? 'memory' : 'json-file';
}

export const env: AppEnv = {
  port: Number(process.env.PORT) || 8787,
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  storageDriver: parseStorageDriver(process.env.STORAGE_DRIVER),
  dataDir: process.env.DATA_DIR || './data',
  notifyEmail: process.env.NOTIFY_EMAIL || 'info@lablace.com',
  adminToken: process.env.ADMIN_TOKEN || null,
};
