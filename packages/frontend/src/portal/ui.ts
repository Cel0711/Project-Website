import { formatMoney, QUOTE_STATUS_LABEL, QUOTE_STEPS, type InvoiceDisplayStatus, type QuoteStatus } from '@coreloop/shared';
import { esc } from '../core/dom.js';

/** Small building blocks the portal views share. Everything returns an HTML string; callers escape their own data with esc(). */

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'brand';

export const money = formatMoney;

export function badge(label: string, tone: Tone = 'neutral'): string {
  return `<span class="badge b-${tone}">${esc(label)}</span>`;
}

const QUOTE_TONE: Record<QuoteStatus, Tone> = {
  submitted: 'info',
  reviewing: 'info',
  quoted: 'warn',
  accepted: 'ok',
  building: 'brand',
  delivered: 'ok',
  declined: 'bad',
  cancelled: 'neutral',
};
export const quoteBadge = (s: QuoteStatus): string => badge(QUOTE_STATUS_LABEL[s], QUOTE_TONE[s]);

export const INVOICE_LABEL: Record<InvoiceDisplayStatus, string> = { draft: 'Draft', sent: 'Sent', partial: 'Part paid', paid: 'Paid', overdue: 'Overdue', void: 'Void' };
const INVOICE_TONE: Record<InvoiceDisplayStatus, Tone> = { draft: 'neutral', sent: 'info', partial: 'warn', paid: 'ok', overdue: 'bad', void: 'neutral' };
export const invoiceBadge = (s: InvoiceDisplayStatus): string => badge(INVOICE_LABEL[s], INVOICE_TONE[s]);

/* ---------- dates ---------- */

/** "2026-10-31" is a calendar day (no time zone); anything longer is a moment in time. */
function toDate(v: string): Date {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(v);
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? '—' : DATE.format(d);
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? '—' : `${DATE.format(d)}, ${TIME.format(d)}`;
}

export function ago(v: string | null | undefined): string {
  if (!v) return '';
  const d = toDate(v);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (Number.isNaN(s)) return '';
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  if (s < 7 * 86_400) return `${Math.round(s / 86_400)} d ago`;
  return fmtDate(v);
}

export const todayIso = (): string => new Date().toISOString().slice(0, 10);
export const inDaysIso = (n: number): string => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/* ---------- layout pieces ---------- */

export function pageHead(title: string, sub = '', actions = ''): string {
  return `<div class="ph"><div><h1 class="ph-t" tabindex="-1">${esc(title)}</h1>${sub ? `<p class="ph-s">${sub}</p>` : ''}</div>${actions ? `<div class="ph-act">${actions}</div>` : ''}</div>`;
}

export function card(title: string, body: string, actions = '', cls = ''): string {
  return `<section class="pcard ${cls}">${title || actions ? `<header class="pcard-h"><h2>${title}</h2>${actions ? `<div class="pcard-act">${actions}</div>` : ''}</header>` : ''}<div class="pcard-b">${body}</div></section>`;
}

export function stat(label: string, value: string, hint = '', tone: Tone = 'neutral'): string {
  return `<div class="stat s-${tone}"><span class="stat-l">${esc(label)}</span><b class="stat-v">${value}</b>${hint ? `<span class="stat-h">${hint}</span>` : ''}</div>`;
}

export function empty(title: string, text = '', cta = ''): string {
  return `<div class="empty"><b>${esc(title)}</b>${text ? `<p>${text}</p>` : ''}${cta}</div>`;
}

export const loading = (): string => '<div class="loading" role="status"><i></i><i></i><i></i><span class="sr">Loading</span></div>';

export function errorBox(message: string): string {
  return `<div class="errbox" role="alert"><b>We could not load this.</b><p>${esc(message)}</p><button class="btn btn-line btn-sm" type="button" data-retry>Try again</button></div>`;
}

export function progressBar(pct: number, label = true): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><i style="width:${p}%"></i></div>${label ? `<span class="pbar-l">${p}%</span>` : ''}`;
}

/** The client's progress tracker: six steps, the finished ones ticked, the current one highlighted. */
export function stepper(status: QuoteStatus): string {
  if (status === 'declined' || status === 'cancelled') {
    return `<div class="steps-end ${status}"><b>${esc(QUOTE_STATUS_LABEL[status])}</b><span>${status === 'declined' ? 'This quote was declined.' : 'This request was cancelled.'}</span></div>`;
  }
  const at = QUOTE_STEPS.findIndex((s) => s.status === status);
  return `<ol class="stepper" aria-label="Progress">${QUOTE_STEPS.map((s, i) => {
    const state = i < at || status === 'delivered' ? 'done' : i === at ? 'now' : 'todo';
    return `<li class="st st-${state}"${state === 'now' ? ' aria-current="step"' : ''}><span class="st-dot">${state === 'done' ? '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.4l2.6 2.6L10 3.4"/></svg>' : i + 1}</span><span class="st-l">${esc(s.label)}</span></li>`;
  }).join('')}</ol>`;
}

/** A rough "how far along is it" for list screens, from the status (and the build progress once building). */
export function overallPct(status: QuoteStatus, progress: number): number {
  const base: Record<QuoteStatus, number> = { submitted: 8, reviewing: 25, quoted: 45, accepted: 55, building: 55, delivered: 100, declined: 0, cancelled: 0 };
  return status === 'building' ? 55 + Math.round(progress * 0.4) : base[status];
}

export function avatar(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
  return `<span class="av" aria-hidden="true">${esc(ini)}</span>`;
}

/** A plain data table. `rows` are already-escaped cell HTML; a row with `href` is clickable. */
export function table(head: { label: string; cls?: string }[], rows: { cells: string[]; href?: string }[], emptyHtml = ''): string {
  if (!rows.length) return emptyHtml;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((h) => `<th class="${h.cls ?? ''}">${esc(h.label)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr${r.href ? ` class="tr-link" data-href="${esc(r.href)}" tabindex="0"` : ''}>${r.cells.map((c, i) => `<td class="${head[i]?.cls ?? ''}" data-l="${esc(head[i]?.label ?? '')}">${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

/** Makes `.tr-link` rows (and anything with data-href) navigate on click or Enter. */
export function wireLinks(root: HTMLElement, go: (path: string) => void): void {
  root.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-href]');
    if (!el || (ev.target as HTMLElement).closest('a,button,input,select,label')) return;
    go(el.dataset['href'] ?? '/');
  });
  root.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const el = (ev.target as HTMLElement).closest<HTMLElement>('tr[data-href]');
    if (el && ev.target === el) go(el.dataset['href'] ?? '/');
  });
}

export function field(label: string, control: string, opts: { id?: string; hint?: string; cls?: string } = {}): string {
  return `<div class="fi ${opts.cls ?? ''}"><label${opts.id ? ` for="${opts.id}"` : ''}>${label}</label>${control}${opts.hint ? `<span class="xs">${opts.hint}</span>` : ''}</div>`;
}

export function options(items: { value: string; label: string }[], selected = ''): string {
  return items.map((o) => `<option value="${esc(o.value)}"${o.value === selected ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
}

export function sum(list: number[]): number {
  return list.reduce((a, b) => a + b, 0);
}
