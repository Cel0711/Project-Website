import type { FinanceSummary } from '@coreloop/shared';
import { esc } from '../core/dom.js';
import { money } from './ui.js';

/** Charts for the Finance dashboard, drawn as inline SVG from real numbers (the studio's own charts use sample data). */

export function shortMoney(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(a >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Invoiced against collected, month by month. */
export function monthlyChart(rows: FinanceSummary['monthly'], currency: string): string {
  const W = 680;
  const H = 250;
  const L = 44;
  const B = 28;
  const T = 10;
  const inv = rows.map((r) => Number(r.invoiced));
  const col = rows.map((r) => Number(r.collected));
  const max = niceMax(Math.max(...inv, ...col, 0));
  const plotH = H - B - T;
  const slot = (W - L - 8) / rows.length;
  const bw = Math.min(16, slot * 0.34);
  const y = (v: number): number => T + plotH - (v / max) * plotH;
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    g += `<line x1="${L}" y1="${y(v)}" x2="${W - 8}" y2="${y(v)}" class="ch-grid"/><text x="${L - 8}" y="${y(v) + 4}" class="ch-t" text-anchor="end">${shortMoney(v)}</text>`;
  }
  const bars = rows
    .map((r, i) => {
      const cx = L + slot * i + slot / 2;
      const m = MONTHS[Number(r.month.slice(5, 7)) - 1] ?? r.month;
      return (
        `<g><title>${esc(m)} ${esc(r.month.slice(0, 4))}: invoiced ${esc(money(r.invoiced, currency))}, collected ${esc(money(r.collected, currency))}</title>` +
        `<rect class="ch-inv" x="${cx - bw - 1}" y="${y(inv[i] ?? 0)}" width="${bw}" height="${Math.max(0, T + plotH - y(inv[i] ?? 0))}" rx="2"/>` +
        `<rect class="ch-col" x="${cx + 1}" y="${y(col[i] ?? 0)}" width="${bw}" height="${Math.max(0, T + plotH - y(col[i] ?? 0))}" rx="2"/>` +
        `<text x="${cx}" y="${H - 8}" class="ch-t" text-anchor="middle">${esc(m)}</text></g>`
      );
    })
    .join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Invoiced and collected per month in ${esc(currency)}">${g}${bars}</svg>
    <div class="legend"><span><i class="ch-inv"></i>Invoiced</span><span><i class="ch-col"></i>Collected</span></div>`;
}

const AGING_LABEL: Record<string, string> = { current: 'Not due yet', '1-30': '1–30 days late', '31-60': '31–60 days late', '61-90': '61–90 days late', '90+': 'Over 90 days late' };

/** What is owed, by how late it is. */
export function agingChart(rows: FinanceSummary['aging'], currency: string): string {
  const max = Math.max(...rows.map((r) => Number(r.amount)), 0);
  if (max <= 0) return '<p class="muted">Nothing is outstanding in this currency.</p>';
  return `<ul class="hbars">${rows
    .map((r) => {
      const pct = (Number(r.amount) / max) * 100;
      const late = r.bucket !== 'current';
      return `<li><span class="hb-l">${esc(AGING_LABEL[r.bucket] ?? r.bucket)}</span><span class="hb-t"><i class="${late ? 'late' : ''}" style="width:${pct}%"></i></span><span class="hb-v">${esc(money(r.amount, currency))}<small>${r.count} invoice${r.count === 1 ? '' : 's'}</small></span></li>`;
    })
    .join('')}</ul>`;
}
