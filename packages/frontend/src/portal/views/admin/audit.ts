import { api } from '../../../api/client.js';
import { $, esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { card, empty, fmtDateTime, pageHead, table } from '../../ui.js';

interface Entry {
  id: number;
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown>;
  ip: string;
  actor: { fullName: string; role: string } | null;
  createdAt: string;
}

const PAGE = 100;

/** The record of who did what: sign-ups, status changes, quotes, invoices and payments. */
const view: View = async (ctx) => {
  let offset = 0;
  ctx.root.innerHTML = pageHead('Audit log', 'Every change made by the team and every account event, newest first.') + '<div id="auList"></div>';

  async function load(): Promise<void> {
    const r = await api.get<{ entries: Entry[] }>(`/api/admin/audit?limit=${PAGE}&offset=${offset}`);
    if (!ctx.alive()) return;
    const host = $('#auList', ctx.root);
    if (!host) return;
    host.innerHTML =
      card(
        '',
        table(
          [{ label: 'When' }, { label: 'Who' }, { label: 'What' }, { label: 'Details', cls: 'hide-s' }, { label: 'Address', cls: 'hide-s' }],
          r.entries.map((e) => {
            const meta = Object.entries(e.meta ?? {}).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ');
            return { cells: [esc(fmtDateTime(e.createdAt)), e.actor ? `${esc(e.actor.fullName)} <small class="muted">${esc(e.actor.role)}</small>` : '<span class="muted">—</span>', `<span class="mono">${esc(e.action)}</span>`, `<small>${esc(meta || e.entity)}</small>`, `<small class="muted">${esc(e.ip || '—')}</small>`] };
          }),
          empty('Nothing recorded yet'),
        ),
        '',
        'flush',
      ) +
      `<div class="pager"><span class="muted">${offset + 1}–${offset + r.entries.length}</span><div><button class="btn btn-line btn-sm" type="button" data-page="prev" ${offset === 0 ? 'disabled' : ''}>Newer</button> <button class="btn btn-line btn-sm" type="button" data-page="next" ${r.entries.length < PAGE ? 'disabled' : ''}>Older</button></div></div>`;
  }

  await load();
  ctx.root.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-page]');
    if (!b) return;
    offset = Math.max(0, offset + (b.dataset['page'] === 'next' ? PAGE : -PAGE));
    void load();
  });
};

export default view;
