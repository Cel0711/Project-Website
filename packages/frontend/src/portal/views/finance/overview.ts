import type { FinanceSummary, InvoiceSummary } from '@coreloop/shared';
import { api, qs } from '../../../api/client.js';
import { esc } from '../../../core/dom.js';
import { agingChart, monthlyChart } from '../../charts.js';
import type { View } from '../../routes.js';
import { card, empty, fmtDate, money, pageHead, stat, table, wireLinks } from '../../ui.js';

/** Finance at a glance, one currency at a time (amounts in different currencies are never added together). */
const view: View = async (ctx) => {
  let currency = ctx.query.get('currency') ?? '';

  const invRows = (list: InvoiceSummary[], cur: string): { href: string; cells: string[] }[] =>
    list.map((i) => ({ href: `/finance/invoices/${encodeURIComponent(i.id)}`, cells: [`<b class="mono">${esc(i.number)}</b>`, esc(i.client.fullName), esc(fmtDate(i.dueOn)), esc(money(i.balance, cur))] }));

  async function paint(): Promise<void> {
    const s = (await api.get<{ summary: FinanceSummary }>(`/api/finance/summary${qs({ currency })}`)).summary;
    if (!ctx.alive()) return;
    currency = s.currency;
    const k = s.kpis;
    const tabs = (s.currencies.length ? s.currencies : [s.currency]).map((c) => `<button class="chip" type="button" data-cur="${esc(c)}" aria-pressed="${c === s.currency}">${esc(c)}</button>`).join('');

    ctx.root.innerHTML =
      pageHead('Finance', 'Billing, payments and what is still owed.', '<a class="btn btn-hi" href="#/finance/invoices/new">New invoice</a>') +
      `<div class="filters" role="group" aria-label="Currency">${tabs}</div>` +
      `<div class="stats stats5">` +
      stat('Invoiced this month', esc(money(k.invoicedThisMonth, s.currency)), 'issued in this currency') +
      stat('Collected this month', esc(money(k.collectedThisMonth, s.currency)), 'payments received', 'ok') +
      stat('Outstanding', esc(money(k.outstanding, s.currency)), 'still to be paid', Number(k.outstanding) > 0 ? 'info' : 'neutral') +
      stat('Overdue', esc(money(k.overdueAmount, s.currency)), `${k.overdueCount} invoice${k.overdueCount === 1 ? '' : 's'} past due`, k.overdueCount ? 'bad' : 'neutral') +
      stat('Days to pay', k.avgDaysToPay == null ? '—' : String(k.avgDaysToPay), 'average, paid invoices, last year') +
      `</div>` +
      `<div class="cols even"><div>${card('Invoiced and collected', monthlyChart(s.monthly, s.currency), '<span class="muted">last 12 months</span>')}</div>` +
      `<div>${card('Who owes what, by lateness', agingChart(s.aging, s.currency))}</div></div>` +
      `<div class="cols even"><div>${card(
        'Overdue',
        table([{ label: 'Invoice' }, { label: 'Client' }, { label: 'Was due' }, { label: 'Owed', cls: 'num' }], invRows(s.attention.overdue, s.currency), '<p class="muted pad">Nothing is overdue. 🎉</p>'),
        '',
        'flush',
      )}${card(
        'Due in the next 7 days',
        table([{ label: 'Invoice' }, { label: 'Client' }, { label: 'Due' }, { label: 'Owed', cls: 'num' }], invRows(s.attention.dueSoon, s.currency), '<p class="muted pad">Nothing falls due this week.</p>'),
        '',
        'flush',
      )}</div><div>${card(
        'Approved, waiting for an invoice',
        s.attention.acceptedWithoutInvoice.length
          ? `<ul class="feed">${s.attention.acceptedWithoutInvoice
              .map((a) => `<li><div><b class="mono">${esc(a.ref)}</b> · ${esc(a.client.fullName)}<small class="muted">${a.amount ? esc(money(a.amount, a.currency)) : 'no quote amount'}</small></div><a class="btn btn-line btn-sm" href="#/finance/invoices/new?client=${encodeURIComponent(a.client.id)}&quote=${encodeURIComponent(a.id)}&currency=${esc(a.currency)}">Create invoice</a></li>`)
              .join('')}</ul>`
          : '<p class="muted">Every approved request has an invoice.</p>',
      )}${card(
        'Top clients, last 12 months',
        s.topClients.length
          ? table([{ label: 'Client' }, { label: 'Invoiced', cls: 'num' }, { label: 'Paid', cls: 'num' }], s.topClients.map((t) => ({ href: `/finance/invoices?clientId=${encodeURIComponent(t.client.id)}`, cells: [esc(t.client.fullName), esc(money(t.invoiced, s.currency)), esc(money(t.paid, s.currency))] })), '')
          : empty('No invoices in this currency yet'),
        '',
        'flush',
      )}</div></div>`;
  }

  await paint();
  wireLinks(ctx.root, ctx.go);
  ctx.root.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-cur]');
    if (!b) return;
    currency = b.dataset['cur'] ?? '';
    void paint();
  });
  ctx.onLive((m) => {
    if (m.type === 'invoice' || m.type === 'quote' || m.type === 'resync') void paint();
  });
};

export default view;
