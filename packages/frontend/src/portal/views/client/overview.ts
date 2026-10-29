import { formatMoney, type ConversationSummary, type InvoiceSummary, type NotificationItem, type QuoteSummary } from '@coreloop/shared';
import { api } from '../../../api/client.js';
import { firstName } from '../../../auth/session.js';
import { esc } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { ago, card, empty, overallPct, pageHead, progressBar, quoteBadge, stat, wireLinks } from '../../ui.js';

const FINISHED = new Set(['delivered', 'declined', 'cancelled']);

const title = (q: QuoteSummary): string => q.planName || q.kinds.join(', ') || 'Quote request';

/** "₱1,200.00 + $300.00": what is owed, one currency at a time. */
function owed(invoices: InvoiceSummary[]): string {
  const by = new Map<string, number>();
  for (const i of invoices) by.set(i.currency, (by.get(i.currency) ?? 0) + Number(i.balance));
  return [...by].map(([cur, n]) => formatMoney(n, cur)).join(' + ');
}

const view: View = async (ctx) => {
  async function paint(): Promise<void> {
    const [qs, cs, is, ns] = await Promise.all([
      api.get<{ quotes: QuoteSummary[] }>('/api/quotes'),
      api.get<{ conversations: ConversationSummary[] }>('/api/conversations').catch(() => ({ conversations: [] as ConversationSummary[] })),
      api.get<{ invoices: InvoiceSummary[] }>('/api/invoices?status=open').catch(() => ({ invoices: [] as InvoiceSummary[] })),
      api.get<{ items: NotificationItem[] }>('/api/notifications').catch(() => ({ items: [] as NotificationItem[] })),
    ]);
    if (!ctx.alive()) return;

    const active = qs.quotes.filter((q) => !FINISHED.has(q.status));
    const waiting = qs.quotes.filter((q) => q.status === 'quoted');
    const unread = cs.conversations.reduce((a, c) => a + c.unread, 0);
    const open = is.invoices;

    const requestCard = (q: QuoteSummary): string =>
      `<a class="rq" href="#/requests/${encodeURIComponent(q.ref)}"><div class="rq-top"><span class="mono rq-ref">${esc(q.ref)}</span>${quoteBadge(q.status)}</div><b class="rq-t">${esc(title(q))}</b>` +
      `<div class="rq-bar">${progressBar(overallPct(q.status, q.progress))}</div><span class="rq-s">Updated ${esc(ago(q.updatedAt))}</span></a>`;

    const offers = waiting
      .map(
        (q) =>
          `<section class="pcard attn"><div class="pcard-b attn-in"><div><span class="tag"><i></i>Needs your answer</span><h2 class="attn-t">Your quote for ${esc(q.ref)} is ready</h2><p class="muted">${q.offerAmount ? `${esc(formatMoney(q.offerAmount, q.offerCurrency ?? q.currency))} fixed price. ` : ''}Review the scope, then approve it or ask us a question.</p></div><a class="btn btn-hi" href="#/requests/${encodeURIComponent(q.ref)}">Review the quote</a></div></section>`,
      )
      .join('');

    ctx.root.innerHTML =
      pageHead(`Welcome back, ${esc(firstName(ctx.user.fullName))}`, 'Here is where your requests stand.', '<a class="btn btn-hi" href="#/new">Get a quote</a>') +
      `<div class="stats">` +
      stat('Active requests', String(active.length), active.length ? 'in progress with us' : 'nothing open right now') +
      stat('Waiting for you', String(waiting.length), waiting.length ? 'quote to approve' : 'nothing to approve', waiting.length ? 'warn' : 'neutral') +
      stat('Unread messages', String(unread), unread ? '<a href="#/messages">Open messages</a>' : 'you are up to date', unread ? 'info' : 'neutral') +
      stat('Open invoices', String(open.length), open.length ? `${esc(owed(open))} to pay` : 'nothing to pay', open.length ? 'warn' : 'neutral') +
      `</div>` +
      offers +
      (active.length
        ? card('Your active requests', `<div class="rq-grid">${active.map(requestCard).join('')}</div>`, '<a class="btn btn-line btn-sm" href="#/requests">All requests</a>')
        : card(
            'Start your first request',
            empty(
              'Tell us what is slowing you down',
              'Send a sketch, a screenshot, a spreadsheet or two paragraphs. We reply within one business day with a scope, a price range and the questions we still have.',
              '<div class="empty-act"><a class="btn btn-hi btn-lg" href="#/new">Get a quote</a><a class="btn btn-line btn-lg" href="/#/studio">Design your screen first</a></div>',
            ),
          )) +
      (ns.items.length
        ? card('Recent updates', `<ul class="feed">${ns.items.slice(0, 6).map((n) => `<li class="${n.readAt ? '' : 'unread'}"><a href="#${esc(n.link || '/')}"><b>${esc(n.title)}</b>${n.body ? `<span>${esc(n.body)}</span>` : ''}</a><time>${esc(ago(n.createdAt))}</time></li>`).join('')}</ul>`)
        : '');
  }

  await paint();
  wireLinks(ctx.root, ctx.go);
  ctx.onLive((m) => {
    if (m.type === 'quote' || m.type === 'invoice' || m.type === 'resync') void paint();
  });
};

export default view;
