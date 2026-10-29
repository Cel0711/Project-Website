import { QUOTE_STATUSES, QUOTE_STATUS_LABEL, type ConversationSummary, type QuoteSummary } from '@coreloop/shared';
import { api } from '../../../api/client.js';
import { firstName } from '../../../auth/session.js';
import { esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { ago, avatar, card, empty, pageHead, quoteBadge, stat, table, wireLinks } from '../../ui.js';

interface Stats {
  byStatus: Record<string, number>;
  newToday: number;
  awaitingReply: number;
  avgFirstActionHours: number | null;
  unassigned: number;
}

const view: View = async (ctx) => {
  async function paint(): Promise<void> {
    const [s, recent, convs] = await Promise.all([
      api.get<{ stats: Stats }>('/api/admin/stats'),
      api.get<{ quotes: QuoteSummary[] }>('/api/admin/quotes?limit=8'),
      api.get<{ conversations: ConversationSummary[] }>('/api/conversations'),
    ]);
    if (!ctx.alive()) return;
    const st = s.stats;
    const max = Math.max(1, ...QUOTE_STATUSES.map((k) => st.byStatus[k] ?? 0));
    const unread = convs.conversations.filter((c) => c.unread > 0).slice(0, 5);

    ctx.root.innerHTML =
      pageHead(`Hello, ${esc(firstName(ctx.user.fullName))}`, 'What needs the team today.', '<a class="btn btn-hi" href="#/requests">All requests</a>') +
      `<div class="stats">` +
      stat('New today', String(st.newToday), 'requests received', st.newToday ? 'info' : 'neutral') +
      stat('Awaiting your reply', String(st.awaitingReply), st.awaitingReply ? '<a href="#/messages">Open messages</a>' : 'every client has an answer', st.awaitingReply ? 'warn' : 'neutral') +
      stat('Unassigned', String(st.unassigned), 'new or in review, no owner', st.unassigned ? 'warn' : 'neutral') +
      stat('First response', st.avgFirstActionHours == null ? '—' : `${st.avgFirstActionHours} h`, 'average, last 90 days') +
      `</div><div class="cols even">` +
      `<div>${card(
        'Latest requests',
        table(
          [{ label: 'Request' }, { label: 'Client' }, { label: 'Status' }, { label: 'Received', cls: 'num' }],
          recent.quotes.map((q) => ({ href: `/requests/${encodeURIComponent(q.ref)}`, cells: [`<b class="mono">${esc(q.ref)}</b>`, esc(q.client?.fullName ?? ''), quoteBadge(q.status), esc(ago(q.createdAt))] })),
          empty('No requests yet', 'They appear here as soon as a client sends one.'),
        ),
        '<a class="btn btn-line btn-sm" href="#/requests">View all</a>',
        'flush',
      )}</div>` +
      `<div>${card(
        'Requests by status',
        `<ul class="hbars">${QUOTE_STATUSES.map((k) => `<li><span class="hb-l">${esc(QUOTE_STATUS_LABEL[k])}</span><span class="hb-t"><i style="width:${((st.byStatus[k] ?? 0) / max) * 100}%"></i></span><span class="hb-v">${st.byStatus[k] ?? 0}</span></li>`).join('')}</ul>`,
      )}${card(
        'Unread messages',
        unread.length
          ? `<ul class="feed">${unread.map((c) => `<li class="unread"><a href="#/messages/${encodeURIComponent(c.id)}"><b>${esc(c.client.fullName)}</b><span>${esc(c.lastMessagePreview)}</span></a><time>${esc(ago(c.lastMessageAt))}</time></li>`).join('')}</ul>`
          : '<p class="muted">You are all caught up.</p>',
      )}</div></div>`;
    void avatar;
  }

  await paint();
  wireLinks(ctx.root, ctx.go);
  ctx.onLive((m) => {
    if (m.type === 'quote' || m.type === 'message' || m.type === 'resync') void paint();
  });
};

export default view;
