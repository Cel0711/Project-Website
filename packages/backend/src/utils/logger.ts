/**
 * Minimal structured logger. PM2 captures stdout/stderr into its own log
 * files (see ecosystem.config.cjs), so this deliberately does not manage
 * log files itself — just prints consistently formatted lines.
 */
type Level = 'info' | 'warn' | 'error';

function line(level: Level, msg: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const suffix = meta ? ' ' + JSON.stringify(meta) : '';
  return `[${ts}] ${level.toUpperCase()} ${msg}${suffix}`;
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>): void {
    console.log(line('info', msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(line('warn', msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>): void {
    console.error(line('error', msg, meta));
  },
};
