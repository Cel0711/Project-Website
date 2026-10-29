/**
 * The one place the browser talks to the backend. Calls go to the same address the page came from
 * (Vite proxies /api in development, nginx does in production), so the session cookie just works;
 * set VITE_API_BASE_URL only if the API really lives somewhere else.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
export const API_BASE = BASE;

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Validation problems as "field: message". */
    readonly issues: string[] = [],
    /** Machine-readable hint such as "must_change_password" or "email_not_verified". */
    readonly code = '',
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /** The message that belongs to one form field, if the server sent one. */
  fieldMessage(field: string): string | undefined {
    const hit = this.issues.find((i) => i.startsWith(`${field}:`));
    return hit ? hit.slice(field.length + 1).trim() : undefined;
  }
}

/** Fires "unauthorized" when a call outside the sign-in forms comes back 401, so a page can send the visitor to sign in. */
export const apiEvents = new EventTarget();

interface ErrorBody {
  error?: string;
  issues?: string[];
  code?: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const data: unknown = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const e = (data ?? {}) as ErrorBody;
    if (res.status === 401 && !path.startsWith('/api/auth/')) apiEvents.dispatchEvent(new Event('unauthorized'));
    throw new ApiRequestError(res.status, e.error ?? (res.status === 503 ? 'The service is temporarily unavailable. Please try again in a moment.' : `Something went wrong (${res.status}).`), e.issues ?? [], e.code ?? '');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}): Promise<T> => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown): Promise<T> => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown): Promise<T> => request<T>('PATCH', path, body),
  del: <T>(path: string): Promise<T> => request<T>('DELETE', path),
};

/** Builds "?a=1&b=2" from the entries that have a value. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
}
