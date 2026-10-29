import 'dotenv/config';

export interface SmtpConfig {
  host: string;
  port: number;
  /** true for port 465 (implicit TLS); false uses STARTTLS on 587. */
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface AppEnv {
  nodeEnv: 'development' | 'production' | 'test';
  isProd: boolean;
  port: number;
  /** Public address of the website: used for links inside emails and as an allowed Origin for writes. */
  appUrl: string;
  corsOrigins: string[];
  /** postgresql://user:password@host:port/database (see .env.example). Null = no database configured. */
  databaseUrl: string | null;
  /** Optional schema to use inside the database (for a "dev" or "test" schema next to production data). */
  dbSchema: string | null;
  dbSsl: boolean;
  cookieSecure: boolean;
  sessionTtlDays: number;
  /** Null = the server cannot send email: verification is skipped and Forgot / Remind me explain that. */
  smtp: SmtpConfig | null;
  companyName: string;
  /** Shared inbox that is emailed when a client sends a new request or message. */
  notifyEmail: string;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function flag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function nodeEnv(): AppEnv['nodeEnv'] {
  const v = process.env.NODE_ENV;
  return v === 'production' || v === 'test' ? v : 'development';
}

function readSmtp(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host,
    port,
    secure: flag(process.env.SMTP_SECURE, port === 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.NOTIFY_EMAIL || 'info@lablace.com',
  };
}

const mode = nodeEnv();

export const env: AppEnv = {
  nodeEnv: mode,
  isProd: mode === 'production',
  port: Number(process.env.PORT) || 8787,
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  databaseUrl: process.env.DATABASE_URL || null,
  dbSchema: process.env.DB_SCHEMA || null,
  dbSsl: flag(process.env.DB_SSL, false),
  cookieSecure: flag(process.env.COOKIE_SECURE, mode === 'production'),
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS) || 14,
  smtp: readSmtp(),
  companyName: process.env.COMPANY_NAME || 'Lab-Lace IT Software & Solutions',
  notifyEmail: process.env.NOTIFY_EMAIL || 'info@lablace.com',
};
