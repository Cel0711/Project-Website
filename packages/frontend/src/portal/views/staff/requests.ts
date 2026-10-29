import { QUOTE_STATUSES, QUOTE_STATUS_LABEL, formatMoney, type QuoteSummary } from '@coreloop/shared';
import { api, qs } from '../../../api/client.js';
import { $, esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { ago, card, empty, options, pageHead, quoteBadge, table, wireLinks } from '../../ui.js';

const PAGE = 25;

/** Every request from every client. Admin works them; Finance can read. */
const view: View = async (ctx) => {
  const admin = ctx.user.role === 'admin';
  const clientId = ctx.query.get('clientId') ?? '';
  let status = ctx.query.get('status') ?? '';
  let owner = '';
  let search = '';
  let offset = 0;
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  ctx.root.innerHTML =
    pageHead('Requests', admin ? 'Open one to review it, send a quote, move it along and talk to the client.' : 'Read-only view of what clients have asked for.') +
    `<div class="toolbar">
       <input id="rqSearch" type="search" placeholder="Search reference, client or company" aria-label="Search requests">
       <select id="rqStatus" aria-label="Status">${options([{ value: '', label: 'Any status' }, ...QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_STATUS_LABEL[s] }))], status)}</select>
       ${admin ? `<select id="rqOwner" aria-label="Owner">${options([{ value: '', label: 'Any owner' }, { value: ctx.user.id, label: 'Mine' }, { value: 'none', label: 'Unassigned' }])}</select>` : ''}
       ${clientId ? '<a class="btn btn-line btn-sm" href="#/requests">Show every client</a>' : ''}
     </div>
     <div id="rqList"></div>`;

  async function load(): Promise<void> {
    const r = await api.get<{ quotes: QuoteSummary[]; total: number }>(`/api/admin/quotes${qs({ status, assignedTo: owner, q: search, clientId, limit: PAGE, offset })}`);
    if (!ctx.alive()) return;
    total = r.total;
    const from = r.quotes.length ? offset + 1 : 0;
    const host = $('#rqList', ctx.root);
    if (!host) return;
    host.innerHTML = card(
      '',
      table(
        [{ label: 'Request' }, { label: 'Client' }, { label: 'Work', cls: 'hide-s' }, { label: 'Status' }, { label: 'Owner', cls: 'hide-s' }, { label: 'Quote', cls: 'num hide-s' }, { label: 'Received', cls: 'num' }],
        r.quotes.map((q) => ({
          href: `/requests/${encodeURIComponent(q.ref)}`,
          cells: [
            `<b class="mono">${esc(q.ref)}</b>`,
            `<b>${esc(q.client?.fullName ?? '')}</b>${q.client?.company ? `<small class="muted"> · ${esc(q.client.company)}</small>` : ''}`,
            esc(q.planName || q.kinds.join(', ') || '—'),
            quoteBadge(q.status),
            q.assignedTo ? esc(q.assignedTo.fullName) : '<span class="muted">Unassigned</span>',
            q.offerAmount ? esc(formatMoney(q.offerAmount, q.offerCurrency ?? q.currency)) : '<span class="muted">—</span>',
            esc(ago(q.createdAt)),
          ],
        })),
        empty('No requests match', 'Try another status or clear the search.'),
      ),
      '',
      'flush',
    ) +
      (total > PAGE
        ? `<div class="pager"><span class="muted">Showing ${from}–${offset + r.quotes.length} of ${total}</span><div><button class="btn btn-line btn-sm" type="button" data-page="prev" ${offset === 0 ? 'disabled' : ''}>Previous</button> <button class="btn btn-line btn-sm" type="button" data-page="next" ${offset + PAGE >= total ? 'disabled' : ''}>Next</button></div></div>`
        : '');
  }

  await load();
  wireLinks(ctx.root, ctx.go);

  $('#rqSearch', ctx.root)?.addEventListener('input', (ev) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      search = (ev.target as HTMLInputElement).value.trim();
      offset = 0;
      void load();
    }, 250);
  });
  $('#rqStatus', ctx.root)?.addEventListener('change', (ev) => {
    status = (ev.target as HTMLSelectElement).value;
    offset = 0;
    void load();
  });
  $('#rqOwner', ctx.root)?.addEventListener('change', (ev) => {
    owner = (ev.target as HTMLSelectElement).value;
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
    if (m.type === 'quote' || m.type === 'resync') void load();
  });
};

export default view;
