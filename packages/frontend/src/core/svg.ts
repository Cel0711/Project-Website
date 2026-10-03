/** Raw SVG/HTML string builders shared by many renderers. All return markup, never DOM nodes — renderers build innerHTML strings throughout. */
import { clamp, esc } from './dom.js';

export function svg(w: number, h: number, inner: string, extra?: string): string {
  return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg" ${extra || ''}>${inner}</svg>`;
}

export function path(d: string, stroke?: string, sw?: number, fill?: string, extra?: string): string {
  return `<path d="${d}" ${fill ? `fill="${fill}"` : 'fill="none"'}${
    stroke ? ` stroke="${stroke}" stroke-width="${sw || 1.5}" stroke-linejoin="round" stroke-linecap="round"` : ''
  } ${extra || ''}/>`;
}

export function rect(x: number, y: number, w: number, h: number, f: string, r?: number, extra?: string): string {
  return `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${r || 0}" fill="${f}" ${extra || ''}/>`;
}

export function txt(x: number, y: number, s: unknown, f?: string, sz?: number, w?: number, an?: string): string {
  return `<text x="${x}" y="${y}" fill="${f || 'var(--sc-text)'}" font-size="${sz || 11}" font-weight="${w || 500}" font-family="Archivo, sans-serif" ${
    an ? `text-anchor="${an}"` : ''
  }>${esc(s)}</text>`;
}

export function polyPts(vals: number[], x: number, y: number, w: number, h: number, lo: number, hi: number): string[] {
  const n = vals.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const px = x + (n < 2 ? 0 : (w * i) / (n - 1));
    const val = vals[i] ?? lo;
    const py = y + h - ((val - lo) / Math.max(0.0001, hi - lo)) * h;
    out.push(`${Math.round(px * 10) / 10},${Math.round(py * 10) / 10}`);
  }
  return out;
}

export function dot(c: string, sz?: number): string {
  return `<span style="width:${sz || 7}px;height:${sz || 7}px;border-radius:50%;background:${c};display:inline-block;flex:none"></span>`;
}

export function pill(label: string, c: string, bg: string, extra?: string): string {
  return `<span style="display:inline-flex;align-items:center;gap:4px;font:500 10px/1 Archivo,sans-serif;color:${c};background:${bg};padding:3px 6px;border-radius:100px;white-space:nowrap;${
    extra || ''
  }">${esc(label)}</span>`;
}

export function bar(pct: number, c: string, h?: number, bg?: string): string {
  return `<div style="height:${h || 6}px;background:${bg || 'var(--sc-panel2)'};border-radius:100px;overflow:hidden"><div style="width:${clamp(
    pct,
    0,
    100,
  )}%;height:100%;background:${c};border-radius:100px"></div></div>`;
}

const STATUS_COLOR_VARS: Record<string, string> = {
  ok: 'var(--sc-ok)',
  warn: 'var(--sc-warn)',
  bad: 'var(--sc-bad)',
  info: 'var(--sc-info)',
  brand: 'var(--sc-brand)',
  accent: 'var(--sc-accent)',
  mut: 'var(--sc-mut)',
};
export function colFor(k?: string): string {
  return (k && STATUS_COLOR_VARS[k]) || 'var(--sc-brand)';
}

export function lines(s: unknown): string[] {
  return String(s || '')
    .split('\n')
    .filter((x) => x.trim() !== '');
}

export function head(title: string, right?: string): string {
  return (
    '<div style="display:flex;align-items:center;gap:8px;padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--sc-line)">' +
    `<b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">${esc(title)}</b>` +
    (right ? `<span style="margin-left:auto;font:400 10px/1 'IBM Plex Mono',monospace;color:var(--sc-mut)">${esc(right)}</span>` : '') +
    '</div>'
  );
}
