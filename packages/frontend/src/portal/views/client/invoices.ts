import type { InvoiceSummary } from '@coreloop/shared';
import { api } from '../../../api/client.js';
import { esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { card, empty, fmtDate, invoiceBadge, money, pageHead, table, wireLinks } from '../../ui.js';

/** A client's own invoices: what was billed, what is paid, what is still owed. */
const view: View = async (ctx) => {
  const load = async (): Promise<void> => {
    const r = await api.get<{ invoices: InvoiceSummary[] }>('/api/invoices?limit=200');
    if (!ctx.alive()) return;
    const list = r.invoices;
    ctx.root.innerHTML =
      pageHead('Invoices', 'Everything we have billed you, and what has been paid.') +
      card(
        '',
        table(
          [{ label: 'Invoice' }, { label: 'Issued', cls: 'hide-s' }, { label: 'Due' }, { label: 'Total', cls: 'num' }, { label: 'To pay', cls: 'num' }, { label: 'Status' }],
          list.map((i) => ({
            href: `/invoices/${encodeURIComponent(i.id)}`,
            cells: [`<b class="mono">${esc(i.number)}</b>${i.quoteRef ? `<small class="muted"> · ${esc(i.quoteRef)}</small>` : ''}`, esc(fmtDate(i.issuedOn)), esc(fmtDate(i.dueOn)), esc(money(i.total, i.currency)), esc(money(i.balance, i.currency)), invoiceBadge(i.displayStatus)],
          })),
          empty('No invoices yet', 'When we bill you for a project, the invoice appears here with its payment status.'),
        ),
        '',
        'flush',
      );
  };
  await load();
  wireLinks(ctx.root, ctx.go);
  ctx.onLive((m) => {
    if (m.type === 'invoice' || m.type === 'resync') void load();
  });
};

export default view;
