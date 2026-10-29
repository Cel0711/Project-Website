import type { CurrencyCode } from '@coreloop/shared';
import { api } from '../../../api/client.js';
import { esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { avatar, card, empty, money, pageHead, table, wireLinks } from '../../ui.js';

interface Balance {
  client: { id: string; fullName: string; email: string; company: string };
  currency: CurrencyCode;
  invoices: number;
  invoiced: string;
  paid: string;
  outstanding: string;
  overdue: string;
}

/** What each client owes, one row per currency. */
const view: View = async (ctx) => {
  const rows = (await api.get<{ balances: Balance[] }>('/api/finance/balances')).balances;
  if (!ctx.alive()) return;
  ctx.root.innerHTML =
    pageHead('Client balances', 'Invoiced, paid and still owed, per client and currency.') +
    card(
      '',
      table(
        [{ label: 'Client' }, { label: 'Currency' }, { label: 'Invoices', cls: 'num hide-s' }, { label: 'Invoiced', cls: 'num hide-s' }, { label: 'Paid', cls: 'num hide-s' }, { label: 'Owed', cls: 'num' }, { label: 'Overdue', cls: 'num' }],
        rows.map((b) => ({
          href: `/finance/invoices?clientId=${encodeURIComponent(b.client.id)}`,
          cells: [
            `<div class="who">${avatar(b.client.fullName)}<div><b>${esc(b.client.fullName)}</b><small class="muted">${esc(b.client.company || b.client.email)}</small></div></div>`,
            esc(b.currency),
            String(b.invoices),
            esc(money(b.invoiced, b.currency)),
            esc(money(b.paid, b.currency)),
            `<b>${esc(money(b.outstanding, b.currency))}</b>`,
            Number(b.overdue) > 0 ? `<span class="late">${esc(money(b.overdue, b.currency))}</span>` : '<span class="muted">—</span>',
          ],
        })),
        empty('No invoices yet', 'Balances appear once an invoice has been sent.'),
      ),
      '',
      'flush',
    );
  wireLinks(ctx.root, ctx.go);
};

export default view;
