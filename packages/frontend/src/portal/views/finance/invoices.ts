import type { InvoiceSummary } from '@coreloop/shared';
import { api, API_BASE, qs } from '../../../api/client.js';
import { $, esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { card, empty, fmtDate, invoiceBadge, money, options, pageHead, table, wireLinks } from '../../ui.js';

const PAGE = 25;
const STATUS = [
  { value: '', label: 'Any status' },
  { value: 'open', label: 'Open (still owed)' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'partial', label: 'Part paid' },
  { value: 'sent', label: 'Sent, unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'draft', label: 'Draft' },
  { value: 'void', label: 'Void' },
];

const view: View = async (ctx) => {
  const clientId = ctx.query.get('clientId') ?? '';
  let status = ctx.query.get('status') ?? '';
  let search = '';
  let offset = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const csvHref = (): string => `${API_BASE}/api/finance/export.csv${qs({ status, clientId, q: search })}`;

  ctx.root.innerHTML =
    pageHead('Invoices', 'Create, send and follow up.', `<a class="btn btn-line" id="csv" href="${esc(csvHref())}" download>Export CSV</a><a class="btn btn-hi" href="#/finance/invoices/new">New invoice</a>`) +
    `<div class="toolbar"><input id="ivSearch" type="search" placeholder="Search number, client or company" aria-label="Search invoices"><select id="ivStatus" aria-label="Status">${options(STATUS, status)}</select>${clientId ? '<a class="btn btn-line btn-sm" href="#/finance/invoices">Show every client</a>' : ''}</div><div id="ivList"></div>`;

  async function load(): Promise<void> {
    const r = await api.get<{ invoices: InvoiceSummary[]; total: number }>(`/api/finance/invoices${qs({ status, clientId, q: search, limit: PAGE, offset })}`);
    if (!ctx.alive()) return;
    const host = $('#ivList', ctx.root);
    if (!host) return;
    $<HTMLAnchorElement>('#csv', ctx.root)?.setAttribute('href', csvHref());
    host.innerHTML =
      card(
        '',
        table(
          [{ label: 'Invoice' }, { label: 'Client' }, { label: 'Issued', cls: 'hide-s' }, { label: 'Due' }, { label: 'Total', cls: 'num' }, { label: 'Owed', cls: 'num' }, { label: 'Status' }],
          r.invoices.map((i) => ({
            href: `/finance/invoices/${encodeURIComponent(i.id)}`,
            cells: [`<b class="mono">${esc(i.number)}</b>`, `<b>${esc(i.client.fullName)}</b>${i.client.company ? `<small class="muted"> · ${esc(i.client.company)}</small>` : ''}`, esc(fmtDate(i.issuedOn)), esc(fmtDate(i.dueOn)), esc(money(i.total, i.currency)), i.status === 'sent' ? esc(money(i.balance, i.currency)) : '<span class="muted">—</span>', invoiceBadge(i.displayStatus)],
          })),
          empty('No invoices match', 'Create one from an approved request, or change the filters.', '<a class="btn btn-hi" href="#/finance/invoices/new">New invoice</a>'),
        ),
        '',
        'flush',
      ) +
      (r.total > PAGE
        ? `<div class="pager"><span class="muted">${offset + 1}–${offset + r.invoices.length} of ${r.total}</span><div><button class="btn btn-line btn-sm" type="button" data-page="prev" ${offset === 0 ? 'disabled' : ''}>Previous</button> <button class="btn btn-line btn-sm" type="button" data-page="next" ${offset + PAGE >= r.total ? 'disabled' : ''}>Next</button></div></div>`
        : '');
  }

  await load();
  wireLinks(ctx.root, ctx.go);
  $('#ivSearch', ctx.root)?.addEventListener('input', (ev) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      search = (ev.target as HTMLInputElement).value.trim();
      offset = 0;
      void load();
    }, 250);
  });
  $('#ivStatus', ctx.root)?.addEventListener('change', (ev) => {
    status = (ev.target as HTMLSelectElement).value;
    offset = 0;
    void load();
  });
  ctx.root.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-page]');
    if (!b) return;
    offset = Math.max(0, offset + (b.dataset['page'] === 'next' ? PAGE : -PAGE));
    void load();
  });
  ctx.cleanup(() => clearTimeout(timer));
  ctx.onLive((m) => {
    if (m.type === 'invoice' || m.type === 'resync') void load();
  });
};

export default view;
