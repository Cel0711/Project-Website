/** The small slice of a Postgres client the app needs, so the same code runs on `pg` (production) and PGlite (tests). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface Queryable {
  query<T = Row>(sql: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
  /** Runs several statements with no parameters (used by migrations). */
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  /** Runs `fn` inside one transaction: committed if it resolves, rolled back if it throws. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function isoOf(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return v == null ? '' : String(v);
}

export function isoOrNull(v: unknown): string | null {
  return v == null ? null : isoOf(v);
}
