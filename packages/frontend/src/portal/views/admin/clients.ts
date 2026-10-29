import type { ConversationSummary, PublicUser } from '@coreloop/shared';
import { api, qs } from '../../../api/client.js';
import { $, esc, toast } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { ago, avatar, card, empty, pageHead, table } from '../../ui.js';

/** Every client account, with a shortcut to their requests and a way to write to them first. */
const view: View = async (ctx) => {
  let search = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  ctx.root.innerHTML = pageHead('Clients', 'People who have signed up to send requests.') + `<div class="toolbar"><input id="clSearch" type="search" placeholder="Search name, email or company" aria-label="Search clients"></div><div id="clList"></div>`;

  async function load(): Promise<void> {
    const r = await api.get<{ users: PublicUser[]; total: number }>(`/api/admin/users${qs({ role: 'client', q: search, limit: 200 })}`);
    if (!ctx.alive()) return;
    const host = $('#clList', ctx.root);
    if (!host) return;
    host.innerHTML = card(
      '',
      table(
        [{ label: 'Client' }, { label: 'Company', cls: 'hide-s' }, { label: 'Currency', cls: 'hide-s' }, { label: 'Joined', cls: 'hide-s' }, { label: 'Last sign-in', cls: 'hide-s' }, { label: '' }],
        r.users.map((u) => ({
          cells: [
            `<div class="who">${avatar(u.fullName)}<div><b>${esc(u.fullName)}</b><small class="muted">${esc(u.email)}${u.emailVerified ? '' : ' · not confirmed'}</small></div></div>`,
            esc(u.company || '—'),
            esc(u.currency),
            esc(ago(u.createdAt)),
            esc(u.lastLoginAt ? ago(u.lastLoginAt) : 'never'),
            `<div class="btn-row"><a class="btn btn-line btn-sm" href="#/requests?clientId=${encodeURIComponent(u.id)}">Requests</a><button class="btn btn-line btn-sm" type="button" data-msg="${esc(u.id)}">Message</button></div>`,
          ],
        })),
        empty('No clients found', search ? 'Try a different search.' : 'Client accounts appear here once people sign up.'),
      ),
      '',
      'flush',
    );
  }

  await load();
  $('#clSearch', ctx.root)?.addEventListener('input', (ev) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      search = (ev.target as HTMLInputElement).value.trim();
      void load();
    }, 250);
  });
  ctx.cleanup(() => clearTimeout(timer));
  ctx.root.addEventListener('click', async (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-msg]');
    if (!b) return;
    try {
      const r = await api.post<{ conversation: ConversationSummary }>('/api/conversations', { clientId: b.dataset['msg'] });
      ctx.go(`/messages/${encodeURIComponent(r.conversation.id)}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not open the conversation.');
    }
  });
};

export default view;
