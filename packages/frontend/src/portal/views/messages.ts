import type { ConversationSummary } from '@coreloop/shared';
import { api } from '../../api/client.js';
import { $, esc } from '../../core/dom.js';
import { mountChat } from '../chat.js';
import { openDialog } from '../dialog.js';
import type { View } from '../routes.js';
import { ago, avatar, empty, options, pageHead } from '../ui.js';

/** Messages: every conversation on the left, the open one on the right. Clients see their own; Admins see all. */
const view: View = async (ctx) => {
  const selected = ctx.params['id'] ?? '';
  const isAdmin = ctx.user.role === 'admin';
  let convs: ConversationSummary[] = [];

  const item = (c: ConversationSummary): string => {
    const title = isAdmin ? c.client.fullName : c.subject;
    const sub = isAdmin ? c.subject : c.quoteRef ? 'About your request' : 'Ask us anything';
    return (
      `<a class="conv${c.id === selected ? ' on' : ''}" href="#/messages/${encodeURIComponent(c.id)}">${isAdmin ? avatar(c.client.fullName) : ''}` +
      `<div class="conv-b"><div class="conv-top"><b>${esc(title)}</b><time>${esc(ago(c.lastMessageAt))}</time></div><div class="conv-sub">${esc(sub)}</div>` +
      `<div class="conv-pre">${esc(c.lastMessagePreview || 'No messages yet')}</div></div>${c.unread ? `<b class="nbadge">${c.unread}</b>` : ''}</a>`
    );
  };

  function paintList(): void {
    const host = $('#convItems', ctx.root);
    if (host) host.innerHTML = convs.length ? convs.map(item).join('') : empty('No conversations yet', isAdmin ? 'Messages from clients appear here. You can also start one.' : 'Send a quote request or write to us below.');
  }

  async function loadList(): Promise<void> {
    convs = (await api.get<{ conversations: ConversationSummary[] }>('/api/conversations')).conversations;
    if (ctx.alive()) paintList();
  }

  convs = (await api.get<{ conversations: ConversationSummary[] }>('/api/conversations')).conversations;
  if (!ctx.alive()) return;

  // On a wide screen open the newest conversation straight away.
  if (!selected && convs[0] && matchMedia('(min-width: 900px)').matches) {
    ctx.go(`/messages/${encodeURIComponent(convs[0].id)}`);
    return;
  }

  ctx.root.innerHTML =
    pageHead('Messages', isAdmin ? 'Talk to your clients. Every request has its own thread, and each client has a general one.' : 'Talk to our team. Every request has its own thread, and there is a general one for anything else.', isAdmin ? '<button class="btn btn-hi btn-sm" type="button" id="newConv">New message</button>' : '') +
    `<div class="msgs${selected ? ' has-sel' : ''}">
       <aside class="pcard conv-list"><div class="pcard-b flush" id="convItems"></div></aside>
       <section class="pcard conv-pane">
         ${selected ? `<header class="pcard-h conv-h"><a class="back-s" href="#/messages" aria-label="Back to conversations">&larr;</a><h2 id="convTitle">Conversation</h2><span class="muted" id="convSub"></span></header><div class="pcard-b flush" id="convChat"></div>` : `<div class="pcard-b">${empty('Choose a conversation', 'Pick one on the left to read it and reply.')}</div>`}
       </section>
     </div>`;
  paintList();

  if (selected) {
    const chatHost = $<HTMLElement>('#convChat', ctx.root);
    if (chatHost) {
      await mountChat(chatHost, selected, ctx, {
        onThread: (c) => {
          const t = $('#convTitle', ctx.root);
          if (t) t.textContent = isAdmin ? c.client.fullName : c.subject;
          const s = $('#convSub', ctx.root);
          if (s) {
            s.innerHTML = isAdmin
              ? `${esc(c.client.company || c.client.email || '')}${c.quoteRef ? ` · <a href="#/requests/${encodeURIComponent(c.quoteRef)}">${esc(c.quoteRef)}</a>` : ''}`
              : c.quoteRef
                ? `<a href="#/requests/${encodeURIComponent(c.quoteRef)}">Open ${esc(c.quoteRef)}</a>`
                : '';
          }
          ctx.setTitle(isAdmin ? `Messages · ${c.client.fullName}` : 'Messages');
        },
      });
    }
  }

  $('#newConv', ctx.root)?.addEventListener('click', async () => {
    const clients = (await api.get<{ clients: { id: string; fullName: string; email: string; company: string }[] }>('/api/admin/clients')).clients;
    openDialog({
      title: 'New message',
      body: clients.length
        ? `<div class="fi"><label for="ncClient">Client</label><select id="ncClient" name="clientId">${options(clients.map((c) => ({ value: c.id, label: `${c.fullName}${c.company ? ` · ${c.company}` : ''} (${c.email})` })))}</select></div><p class="muted">This opens their general conversation, where you can write first.</p>`
        : '<p class="muted">There are no client accounts yet.</p>',
      submit: clients.length ? 'Open conversation' : undefined,
      onSubmit: async (d) => {
        const r = await api.post<{ conversation: ConversationSummary }>('/api/conversations', { clientId: d['clientId'] });
        ctx.go(`/messages/${encodeURIComponent(r.conversation.id)}`);
      },
    });
  });

  ctx.onLive((m) => {
    if (m.type === 'message' || m.type === 'resync') void loadList();
  });
};

export default view;
