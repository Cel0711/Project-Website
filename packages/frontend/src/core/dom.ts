/** Tiny DOM/format helpers used throughout the app — typed equivalents of the original file's top-of-script utilities. */

export function $<T extends Element = Element>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

export function $$<T extends Element = Element>(sel: string, root: ParentNode = document): T[] {
  return Array.prototype.slice.call(root.querySelectorAll(sel));
}

const ESCAPE_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ESCAPE_MAP[c] ?? c);
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function uid(): string {
  return 'e' + Math.random().toString(36).slice(2, 8) + (Date.now() % 9973).toString(36);
}

export function round(n: number, d = 0): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

/** Deterministic PRNG (mulberry-ish LCG) so a given seed always draws the same series. */
export function srnd(seed: number): () => number {
  let s = (seed >>> 0) || 7;
  return function next(): number {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function series(seed: number, n: number, lo: number, hi: number, smooth?: boolean): number[] {
  const r = srnd(seed);
  const out: number[] = [];
  let v = lo + (hi - lo) * r();
  for (let i = 0; i < n; i++) {
    const t = (r() - 0.45) * (hi - lo) * (smooth ? 0.28 : 0.75);
    v = clamp(v + t, lo, hi);
    out.push(round(v, 1));
  }
  return out;
}

export function minmax(v: number[]): [number, number] {
  return [Math.min(...v), Math.max(...v)];
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string): void {
  const t = $<HTMLElement>('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
