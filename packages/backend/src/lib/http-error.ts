import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

/** An error the API turns into a clean JSON answer: { ok:false, error, issues?, code? }. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly extra: { issues?: string[]; code?: string } = {},
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string, extra?: { issues?: string[]; code?: string }): HttpError => new HttpError(400, msg, extra);
export const unauthorized = (msg = 'Please sign in'): HttpError => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have access to this', code?: string): HttpError => new HttpError(403, msg, code ? { code } : {});
export const notFound = (msg = 'Not found'): HttpError => new HttpError(404, msg);
export const conflict = (msg: string): HttpError => new HttpError(409, msg);

/** Validates `data` against a zod schema and returns the parsed value, or throws a 400 listing every problem. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const issues = r.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message));
  throw badRequest(r.error.issues[0]?.message ?? 'Invalid request', { issues });
}

/** Express 4 does not catch rejected promises, so every async handler goes through this. */
export function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
