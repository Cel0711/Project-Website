import { CURRENCIES, PAYMENT_METHOD_LABEL, type CurrencyCode, type Payment } from '@coreloop/shared';
import { api, qs } from '../../../api/client.js';
import { $, esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { card, empty, fmtDate, money, options, pageHead, table, wireLinks } from '../../ui.js';

type Row = Payment & { invoiceNumber: string; currency: CurrencyCode; client: { id: string; fullName: string } };

/** Every payment received, newest first. Payments are recorded on the invoice itself. */
const view: View = async (ctx) => {
  let currency = '';
  ctx.root.innerHTML = pageHead('Payments', 'Money received, across all invoices. Record a payment from the invoice it belongs to.') + `<div class="toolbar"><select id="pyCur" aria-label="Currency">${options([{ value: '', label: 'All currencies' }, ...CURRENCIES.map((c) => ({ value: c.code, label: c.code }))])}</select></div><div id="pyList"></div>`;

  async function load(): Promise<void> {
    const r = await api.get<{ payments: Row[]; total: number }>(`/api/finance/payments${qs({ currency, limit: 200 })}`);
    if (!ctx.alive()) return;
    const host = $('#pyList', ctx.root);
    if (!host) return;
    host.innerHTML = card(
      '',
      table(
        [{ label: 'Date' }, { label: 'Invoice' }, { label: 'Client' }, { label: 'Method', cls: 'hide-s' }, { label: 'Reference', cls: 'hide-s' }, { label: 'Amount', cls: 'num' }, { label: 'Recorded by', cls: 'hide-s' }],
        r.payments.map((p) => ({
          href: `/finance/invoices/${encodeURIComponent(p.invoiceId)}`,
          cells: [esc(fmtDate(p.paidOn)), `<b class="mono">${esc(p.invoiceNumber)}</b>`, esc(p.client.fullName), esc(PAYMENT_METHOD_LABEL[p.method]), esc(p.reference || '—'), `<b>${esc(money(p.amount, p.currency))}</b>`, esc(p.recordedBy?.fullName ?? '—')],
        })),
        empty('No payments recorded yet', 'Open a sent invoice and choose Record payment when money arrives.'),
      ),
      '',
      'flush',
    );
  }

  await load();
  wireLinks(ctx.root, ctx.go);
  $('#pyCur', ctx.root)?.addEventListener('change', (ev) => {
    currency = (ev.target as HTMLSelectElement).value;
    void load();
  });
  ctx.onLive((m) => {
    if (m.type === 'invoice' || m.type === 'resync') void load();
  });
};

export default view;
