/** Money is kept as whole cents while calculating, and travels as "1234.50" strings. */
export function toCents(v: string | number): number {
  return Math.round(Number(v) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function money(v: unknown): string {
  return fromCents(toCents(v as string | number));
}

/** Today as YYYY-MM-DD (UTC), for comparing against due dates. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
