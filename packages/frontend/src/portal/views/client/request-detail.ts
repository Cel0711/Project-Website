import { formatMoney, QUOTE_STEPS, type QuoteRecord } from '@coreloop/shared';
import { api, ApiRequestError } from '../../../api/client.js';
import { $, esc, toast } from '../../../core/dom.js';
import { mountChat } from '../../chat.js';
import { openDialog } from '../../dialog.js';
import { designCard, detailsCard, mountDesign, offerCard, timeline } from '../../request-parts.js';
import type { View } from '../../routes.js';
import { card, fmtDate, progressBar, quoteBadge, stepper } from '../../ui.js';

const CANCELLABLE = new Set(['submitted', 'reviewing', 'quoted']);

const view: View = async (ctx) => {
  const ref = ctx.params['id'] ?? '';
  const url = `/api/quotes/${encodeURIComponent(ref)}`;
  let q = (await api.get<{ quote: QuoteRecord }>(url)).quote;
  if (!ctx.alive()) return;
  ctx.setTitle(q.ref);

  ctx.root.innerHTML = `<a class="back" href="#/requests">&larr; My requests</a><div id="rqHead"></div><div class="cols"><div class="col-main" id="rqMain"></div><aside class="col-side"><div class="pcard sticky"><header class="pcard-h"><h2>Messages</h2></header><div class="pcard-b flush" id="rqChat"></div></div></aside></div>`;

  function paint(): void {
    const stage = QUOTE_STEPS.find((s) => s.status === q.status);
    const money = q.offer ? formatMoney(q.offer.amount, q.offer.currency) : '';
    const offerActions =
      q.status === 'quoted'
        ? `<button class="btn btn-hi" type="button" data-act="approve">Approve quote</button><button class="btn btn-line" type="button" data-act="decline">Decline</button><button class="btn btn-line" type="button" data-act="ask">Ask a question</button>`
        : q.status === 'accepted' || q.status === 'building' || q.status === 'delivered'
          ? `<span class="okline">You approved this quote${money ? ` (${esc(money)})` : ''}.</span>`
          : '';
    $('#rqHead', ctx.root)!.innerHTML =
      `<div class="ph"><div><h1 class="ph-t" tabindex="-1">${esc(q.ref)} ${quoteBadge(q.status)}</h1><p class="ph-s">${esc(q.planName || q.kinds.join(', ') || 'Quote request')} · sent ${esc(fmtDate(q.createdAt))}</p></div>` +
      (CANCELLABLE.has(q.status) ? `<div class="ph-act"><button class="btn btn-line btn-sm" type="button" data-act="cancel">Cancel request</button></div>` : '') +
      `</div>` +
      card('', `${stepper(q.status)}${q.status === 'building' ? `<div class="build-bar"><span>Build progress</span>${progressBar(q.progress)}</div>` : ''}${stage && q.status !== 'delivered' ? `<p class="stage-hint">${esc(stage.hint)}</p>` : ''}${q.status === 'delivered' ? '<p class="stage-hint">All done. Source code, documentation and a training session have been handed over.</p>' : ''}`) +
      offerCard(q, offerActions);

    $('#rqMain', ctx.root)!.innerHTML = card('Progress and updates', timeline(q.events, false)) + detailsCard(q) + designCard(q);
    mountDesign(ctx.root, q);
  }

  async function reload(): Promise<void> {
    q = (await api.get<{ quote: QuoteRecord }>(url)).quote;
    if (ctx.alive()) paint();
  }

  async function decide(action: 'approve' | 'decline' | 'cancel'): Promise<void> {
    const text = {
      approve: { title: 'Approve this quote?', msg: `You are approving ${q.offer ? esc(formatMoney(q.offer.amount, q.offer.currency)) : 'the quote'} for ${esc(q.ref)}. We will schedule the build and send you an invoice.`, ok: 'Approve quote', note: 'Anything we should know? (optional)' },
      decline: { title: 'Decline this quote?', msg: 'We will close this request. Tell us why if you like, so we can do better.', ok: 'Decline quote', note: 'Reason (optional)' },
      cancel: { title: 'Cancel this request?', msg: `${esc(q.ref)} will be closed. You can always send a new request.`, ok: 'Cancel request', note: 'Reason (optional)' },
    }[action];
    openDialog({
      title: text.title,
      body: `<p class="dlg-msg">${text.msg}</p><div class="fi"><label for="dNote">${text.note}</label><textarea id="dNote" name="note" rows="3"></textarea></div>`,
      submit: text.ok,
      danger: action !== 'approve',
      onSubmit: async (d) => {
        const r = await api.post<{ quote: QuoteRecord }>(`${url}/${action}`, { note: d['note'] ?? '' });
        q = r.quote;
        toast(action === 'approve' ? 'Quote approved. Thank you!' : action === 'decline' ? 'Quote declined.' : 'Request cancelled.');
        paint();
        ctx.refresh();
      },
    });
  }

  paint();
  ctx.root.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b) return;
    const act = b.dataset['act'];
    if (act === 'ask') $<HTMLTextAreaElement>('#chatBox', ctx.root)?.focus();
    else if (act === 'approve' || act === 'decline' || act === 'cancel') void decide(act);
  });

  if (q.conversationId) {
    try {
      await mountChat($('#rqChat', ctx.root)!, q.conversationId, ctx);
    } catch (e) {
      $('#rqChat', ctx.root)!.innerHTML = `<p class="muted pad">Messages are unavailable right now. ${e instanceof ApiRequestError ? esc(e.message) : ''}</p>`;
    }
  } else $('#rqChat', ctx.root)!.innerHTML = '<p class="muted pad">Messages for this request will appear here.</p>';

  ctx.onLive((m) => {
    if ((m.type === 'quote' && m.id === q.id) || m.type === 'resync') void reload();
  });
};

export default view;
