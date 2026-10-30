import type { ChatMessage, ConversationSummary } from '@coreloop/shared';
import { api, ApiRequestError } from '../api/client.js';
import { $, esc, toast } from '../core/dom.js';
import type { ViewCtx } from './routes.js';

/**
 * One conversation as a chat: bubbles, a box to write in, live updates and "Seen".
 * Used by the Messages screen and by the request screens, for clients and Admins alike.
 */
interface Thread {
  conversation: ConversationSummary;
  messages: ChatMessage[];
  otherReadId: number;
}

const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const t = new Date();
  const y = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === t.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return DAY.format(d);
}

export interface ChatHandle {
  /** Fetches the whole thread again (after a reconnect, say). */
  reload(): Promise<void>;
}

export async function mountChat(host: HTMLElement, convId: string, ctx: ViewCtx, opts: { onThread?: (t: ConversationSummary) => void } = {}): Promise<ChatHandle> {
  host.innerHTML = `<div class="chat"><div class="chat-log" role="log" aria-live="polite" aria-label="Messages" tabindex="0"></div>
    <form class="chat-form" novalidate><label class="sr" for="chatBox">Write a message</label><textarea id="chatBox" rows="1" maxlength="5000" placeholder="Write a message…" aria-describedby="chatHint"></textarea><span class="sr" id="chatHint">Press Enter to send, Shift and Enter for a new line.</span><button class="btn btn-hi" type="submit">Send</button></form></div>`;
  const log = $<HTMLElement>('.chat-log', host)!;
  const form = $<HTMLFormElement>('.chat-form', host)!;
  const box = $<HTMLTextAreaElement>('textarea', form)!;

  let messages: ChatMessage[] = [];
  let otherReadId = 0;
  let unread = 0;
  let sending = false;
  const me = ctx.user;
  const viewerIsClient = me.role === 'client';

  const nearBottom = (): boolean => log.scrollHeight - log.scrollTop - log.clientHeight < 90;
  const toBottom = (): void => {
    log.scrollTop = log.scrollHeight;
  };

  function bubble(m: ChatMessage, seen: boolean): string {
    if (m.system) return `<div class="msg sys" data-id="${m.id}"><span>${esc(m.body)}</span><time>${esc(TIME.format(new Date(m.createdAt)))}</time></div>`;
    const mine = m.sender.id === me.id;
    const who = mine ? 'You' : m.sender.role === 'client' ? m.sender.fullName : viewerIsClient ? `${m.sender.fullName} · Labb-Lace team` : m.sender.fullName;
    return `<div class="msg ${mine ? 'mine' : 'theirs'}" data-id="${m.id}"><div class="msg-b">${esc(m.body)}</div><div class="msg-m">${esc(who)} · <time>${esc(TIME.format(new Date(m.createdAt)))}</time>${seen ? ' · <span class="seen">Seen</span>' : ''}</div></div>`;
  }

  function draw(keepScroll = false): void {
    const stick = !keepScroll || nearBottom();
    // the new-message divider goes before the first of the unread messages from the other side
    let dividerAt = -1;
    if (unread > 0) {
      const others = messages.map((m, i) => ({ m, i })).filter((x) => x.m.sender.id !== me.id && !x.m.system);
      dividerAt = others[Math.max(0, others.length - unread)]?.i ?? -1;
    }
    let lastMineId = 0;
    for (const m of messages) if (m.sender.id === me.id && !m.system) lastMineId = m.id;
    let html = '';
    let day = '';
    messages.forEach((m, i) => {
      const d = dayLabel(m.createdAt);
      if (d !== day) {
        day = d;
        html += `<div class="chat-day"><span>${esc(d)}</span></div>`;
      }
      if (i === dividerAt) html += '<div class="chat-new"><span>New</span></div>';
      html += bubble(m, m.id === lastMineId && otherReadId >= m.id);
    });
    log.innerHTML = html || '<p class="chat-empty">No messages yet. Say hello — we usually reply within one business day.</p>';
    if (stick) toBottom();
  }

  async function markRead(): Promise<void> {
    if (document.visibilityState !== 'visible' || unread < 1) return;
    unread = 0;
    try {
      await api.post(`/api/conversations/${encodeURIComponent(convId)}/read`, {});
      ctx.refresh();
    } catch {
      /* it will be tried again on the next message */
    }
  }

  async function load(): Promise<void> {
    const t = await api.get<Thread & { ok: true }>(`/api/conversations/${encodeURIComponent(convId)}/messages`);
    if (!ctx.alive()) return;
    messages = t.messages;
    otherReadId = t.otherReadId;
    unread = t.conversation.unread;
    opts.onThread?.(t.conversation);
    draw();
    void markRead().then(() => undefined);
  }

  /** Only what is new since the last message we have. */
  async function fetchNew(): Promise<void> {
    const last = messages[messages.length - 1]?.id ?? 0;
    const t = await api.get<Thread & { ok: true }>(`/api/conversations/${encodeURIComponent(convId)}/messages?after=${last}`);
    if (!ctx.alive()) return;
    const fresh = t.messages.filter((m) => !messages.some((x) => x.id === m.id));
    otherReadId = t.otherReadId;
    unread = t.conversation.unread;
    if (fresh.length) messages = messages.concat(fresh);
    draw(true);
    void markRead();
  }

  async function send(): Promise<void> {
    const body = box.value.trim();
    if (!body || sending) return;
    sending = true;
    box.disabled = true;
    try {
      const r = await api.post<{ ok: true; message: ChatMessage }>(`/api/conversations/${encodeURIComponent(convId)}/messages`, { body });
      if (!messages.some((m) => m.id === r.message.id)) messages.push(r.message);
      box.value = '';
      box.style.height = '';
      draw();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : 'Could not send. Try again.');
    } finally {
      sending = false;
      box.disabled = false;
      box.focus();
    }
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    void send();
  });
  box.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      void send();
    }
  });
  box.addEventListener('input', () => {
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 140)}px`;
  });
  log.addEventListener('scroll', () => {
    if (nearBottom()) void markRead();
  });

  ctx.onLive((m) => {
    if (m.type === 'resync') void load();
    else if (m.type === 'message' && m.conversationId === convId) void fetchNew();
  });

  await load();
  return { reload: load };
}
