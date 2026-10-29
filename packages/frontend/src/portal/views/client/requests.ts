import type { QuoteSummary } from '@coreloop/shared';
import { api } from '../../../api/client.js';
import { esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { ago, card, empty, overallPct, pageHead, progressBar, quoteBadge, table, wireLinks } from '../../ui.js';

const FINISHED = new Set(['delivered', 'declined', 'cancelled']);
type Tab = 'active' | 'finished' | 'all';

const view: View = async (ctx) => {
  let tab: Tab = 'active';
  let all: QuoteSummary[] = [];

  function paint(): void {
    const rows = all.filter((q) => (tab === 'all' ? true : tab === 'finished' ? FINISHED.has(q.status) : !FINISHED.has(q.status)));
    const count = (t: Tab): number => all.filter((q) => (t === 'all' ? true : t === 'finished' ? FINISHED.has(q.status) : !FINISHED.has(q.status))).length;
    const chip = (t: Tab, label: string): string => `<button class="chip" type="button" data-tab="${t}" aria-pressed="${tab === t}">${label} <span class="mono">${count(t)}</span></button>`;
    ctx.root.innerHTML =
      pageHead('My requests', 'Everything you have asked us for, and how far along it is.', '<a class="btn btn-hi" href="#/new">Get a quote</a>') +
      `<div class="filters">${chip('active', 'Active')}${chip('finished', 'Finished')}${chip('all', 'All')}</div>` +
      card(
        '',
        table(
          [{ label: 'Request' }, { label: 'What' }, { label: 'Status' }, { label: 'Progress', cls: 'hide-s' }, { label: 'Updated', cls: 'num' }],
          rows.map((q) => ({
            href: `/requests/${encodeURIComponent(q.ref)}`,
            cells: [
              `<b class="mono">${esc(q.ref)}</b>`,
              esc(q.planName || q.kinds.join(', ') || 'Quote request'),
              quoteBadge(q.status),
              `<div class="cell-bar">${progressBar(overallPct(q.status, q.progress))}</div>`,
              esc(ago(q.updatedAt)),
            ],
          })),
          empty(tab === 'active' ? 'No active requests' : 'Nothing here yet', 'When you send a request it appears here, and you can follow every step.', '<a class="btn btn-hi" href="#/new">Get a quote</a>'),
        ),
        '',
        'flush',
      );
  }

  async function load(): Promise<void> {
    const r = await api.get<{ quotes: QuoteSummary[] }>('/api/quotes');
    if (!ctx.alive()) return;
    all = r.quotes;
    paint();
  }

  await load();
  wireLinks(ctx.root, ctx.go);
  ctx.root.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-tab]');
    if (b) {
      tab = b.dataset['tab'] as Tab;
      paint();
    }
  });
  ctx.onLive((m) => {
    if (m.type === 'quote' || m.type === 'resync') void load();
  });
};

export default view;
