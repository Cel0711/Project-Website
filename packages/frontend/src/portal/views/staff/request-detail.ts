import { CURRENCIES, QUOTE_STATUS_LABEL, QUOTE_TRANSITIONS, type PublicUser, type QuoteRecord, type QuoteStatus } from '@coreloop/shared';
import { api, ApiRequestError } from '../../../api/client.js';
import { $, esc, toast } from '../../../core/dom.js';
import { mountChat } from '../../chat.js';
import { designCard, detailsCard, mountDesign, offerCard, timeline } from '../../request-parts.js';
import type { View } from '../../routes.js';
import { avatar, card, field, fmtDate, inDaysIso, options, progressBar, quoteBadge, stepper } from '../../ui.js';

const message = (e: unknown): string => (e instanceof ApiRequestError ? (e.issues.length ? e.issues.map((i) => i.replace(/^[^:]+:\s*/, '')).join(' ') : e.message) : 'Something went wrong. Please try again.');

/** One request, from the team's side: move it along, quote it, talk to the client. Finance sees it read-only. */
const view: View = async (ctx) => {
  const admin = ctx.user.role === 'admin';
  const ref = ctx.params['id'] ?? '';
  const url = `/api/admin/quotes/${encodeURIComponent(ref)}`;
  let q = (await api.get<{ quote: QuoteRecord }>(url)).quote;
  const owners = admin ? (await api.get<{ users: PublicUser[] }>('/api/admin/users?role=admin&status=active')).users : [];
  if (!ctx.alive()) return;
  ctx.setTitle(q.ref);

  const billable = (): boolean => q.status === 'accepted' || q.status === 'building' || q.status === 'delivered';

  ctx.root.innerHTML = `<a class="back" href="#/requests">&larr; Requests</a><div id="sdHead"></div>
    <div class="cols"><div class="col-main"><div id="sdTop"></div>${admin ? '<div id="sdManage"></div>' : ''}<div id="sdOffer"></div><div id="sdTimeline"></div><div id="sdDetails"></div><div id="sdDesign"></div></div>
    <aside class="col-side"><div id="sdClient"></div>${admin ? '<div class="pcard sticky"><header class="pcard-h"><h2>Messages</h2></header><div class="pcard-b flush" id="sdChat"></div></div>' : ''}</aside></div>`;
  const $$ = (id: string): HTMLElement => $(`#${id}`, ctx.root)!;

  /** Parts that change when the client or a teammate acts: safe to redraw while someone types in a form. */
  function paintLive(): void {
    const c = q.client;
    $$('sdHead').innerHTML =
      `<div class="ph"><div><h1 class="ph-t" tabindex="-1">${esc(q.ref)} ${quoteBadge(q.status)}</h1><p class="ph-s">${esc(q.planName || q.kinds.join(', ') || 'Quote request')} · ${esc(c?.fullName ?? '')} · sent ${esc(fmtDate(q.createdAt))}</p></div>` +
      (billable() ? `<div class="ph-act"><a class="btn btn-hi btn-sm" href="#/finance/invoices/new?client=${encodeURIComponent(c?.id ?? '')}&quote=${encodeURIComponent(q.id)}&currency=${encodeURIComponent(q.offer?.currency ?? q.currency)}">Create invoice</a></div>` : '') +
      `</div>`;
    $$('sdTop').innerHTML = card('', `${stepper(q.status)}${q.status === 'building' ? `<div class="build-bar"><span>Build progress</span>${progressBar(q.progress)}</div>` : ''}`);
    $$('sdOffer').innerHTML = offerCard(q, '');
    $$('sdTimeline').innerHTML = card('Timeline', timeline(q.events, true));
    $$('sdClient').innerHTML = card(
      'Client',
      `<div class="who">${avatar(c?.fullName ?? '?')}<div><b>${esc(c?.fullName ?? '')}</b><small class="muted">${esc(c?.company ?? '')}</small></div></div>
       <dl class="dl dl-tight"><div><dt>Email</dt><dd>${c?.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd></div><div><dt>Phone</dt><dd>${esc(q.contact.phone) || '—'}</dd></div><div><dt>Owner</dt><dd>${q.assignedTo ? esc(q.assignedTo.fullName) : '<span class="muted">Unassigned</span>'}</dd></div></dl>
       <div class="btn-row"><a class="btn btn-line btn-sm" href="#/requests?clientId=${encodeURIComponent(c?.id ?? '')}">All their requests</a>${billable() ? '' : ''}</div>`,
    );
  }

  /** The static-ish parts. */
  function paintStatic(): void {
    $$('sdDetails').innerHTML = detailsCard(q);
    $$('sdDesign').innerHTML = designCard(q);
    mountDesign($$('sdDesign'), q);
  }

  /** The status the controls were drawn for: when it changes underneath the Admin (the client approved), they are redrawn. */
  let shownStatus: QuoteStatus = q.status;

  /** The Admin's controls. */
  function paintManage(): void {
    if (!admin) return;
    shownStatus = q.status;
    const next = QUOTE_TRANSITIONS[q.status].filter((s) => s !== 'quoted');
    const canOffer = q.status === 'submitted' || q.status === 'reviewing' || q.status === 'quoted';
    const offerCur = q.offer?.currency ?? q.currency;
    $$('sdManage').innerHTML = card(
      'Manage this request',
      `<div class="manage">
        ${next.length ? `<form class="mrow" data-form="status" novalidate><h3 class="sub">Status</h3><div class="mfields"><select name="status" aria-label="New status">${options(next.map((s: QuoteStatus) => ({ value: s, label: QUOTE_STATUS_LABEL[s] })))}</select><input name="note" placeholder="Note for the client (optional)" aria-label="Note"><button class="btn btn-line btn-sm" type="submit">Update status</button></div></form>` : '<p class="muted">This request is finished, so its status is fixed.</p>'}
        ${q.status === 'building' ? `<form class="mrow" data-form="progress" novalidate><h3 class="sub">Build progress</h3><div class="mfields"><input type="range" name="progress" min="0" max="100" step="5" value="${q.progress}" aria-label="Progress" data-range><output class="mono" data-out>${q.progress}%</output><input name="note" placeholder="What is on staging? (optional)" aria-label="Progress note"><button class="btn btn-line btn-sm" type="submit">Save progress</button></div></form>` : ''}
        <form class="mrow" data-form="owner" novalidate><h3 class="sub">Owner</h3><div class="mfields"><select name="assignedTo" aria-label="Owner">${options([{ value: '', label: 'Unassigned' }, ...owners.map((o) => ({ value: o.id, label: o.fullName }))], q.assignedTo?.id ?? '')}</select><button class="btn btn-line btn-sm" type="submit">Assign</button></div></form>
        ${canOffer ? `<form class="mrow" data-form="offer" novalidate><h3 class="sub">${q.offer ? 'Revise the quote' : 'Send a quote'}</h3>
          <div class="mgrid">${field('Fixed price', `<input id="ofAmt" name="amount" inputmode="decimal" placeholder="0.00" value="${q.offer ? esc(q.offer.amount) : ''}" required>`, { id: 'ofAmt' })}${field('Currency', `<select id="ofCur" name="currency">${options(CURRENCIES.map((c) => ({ value: c.code, label: c.code })), offerCur)}</select>`, { id: 'ofCur' })}${field('Valid until', `<input id="ofVal" name="validUntil" type="date" value="${esc(q.offer?.validUntil ?? inDaysIso(30))}">`, { id: 'ofVal' })}</div>
          ${field('What the price covers', `<textarea id="ofSum" name="summary" rows="3" placeholder="Scope, screens, integrations, what is not included…" required>${esc(q.offer?.summary ?? '')}</textarea>`, { id: 'ofSum' })}
          <p class="form-err" data-err hidden></p><button class="btn btn-hi btn-sm" type="submit">${q.offer ? 'Send revised quote' : 'Send quote to client'}</button></form>` : ''}
        <form class="mrow" data-form="note" novalidate><h3 class="sub">Add a note</h3><textarea name="body" rows="2" placeholder="Write a note for the timeline" aria-label="Note"></textarea><div class="mfields"><label class="check"><input type="checkbox" name="visibleToClient"> Show it to the client</label><button class="btn btn-line btn-sm" type="submit">Add note</button></div></form>
      </div>`,
    );
  }

  /** Redraws the controls without losing what the Admin has typed or where their cursor was. */
  function repaintManage(): void {
    const host = $$('sdManage');
    const saved = new Map<string, string | boolean>();
    host.querySelectorAll<HTMLInputElement>('[name]').forEach((el) => saved.set(`${el.closest('form')?.dataset['form']}.${el.name}`, el.type === 'checkbox' ? el.checked : el.value));
    const active = document.activeElement instanceof HTMLElement && host.contains(document.activeElement) ? `${document.activeElement.closest('form')?.dataset['form']}.${(document.activeElement as HTMLInputElement).name}` : '';
    paintManage();
    host.querySelectorAll<HTMLInputElement>('[name]').forEach((el) => {
      const key = `${el.closest('form')?.dataset['form']}.${el.name}`;
      const v = saved.get(key);
      if (v === undefined) return;
      if (el.type === 'checkbox') el.checked = v === true;
      else if (el.tagName !== 'SELECT' || [...(el as unknown as HTMLSelectElement).options].some((o) => o.value === v)) el.value = String(v);
      if (key === active) el.focus();
    });
  }

  async function reload(): Promise<void> {
    q = (await api.get<{ quote: QuoteRecord }>(url)).quote;
    if (!ctx.alive()) return;
    paintLive();
    // the controls depend on the status, so redraw them if it moved; otherwise leave them alone while the Admin is typing
    if (admin && (q.status !== shownStatus || !$$('sdManage').contains(document.activeElement))) repaintManage();
  }

  async function act(run: () => Promise<{ quote: QuoteRecord }>, done: string, err?: HTMLElement | null): Promise<void> {
    try {
      q = (await run()).quote;
      toast(done);
      paintLive();
      paintManage();
      ctx.refresh();
    } catch (e) {
      if (err) {
        err.textContent = message(e);
        err.hidden = false;
      } else toast(message(e));
    }
  }

  paintLive();
  paintStatic();
  paintManage();

  if (admin) {
    ctx.root.addEventListener('input', (ev) => {
      const t = ev.target as HTMLInputElement;
      if (t.matches('[data-range]')) {
        const out = t.closest('.mfields')?.querySelector('[data-out]');
        if (out) out.textContent = `${t.value}%`;
      }
    });
    ctx.root.addEventListener('submit', (ev) => {
      const form = (ev.target as HTMLElement).closest<HTMLFormElement>('form[data-form]');
      if (!form) return;
      ev.preventDefault();
      const f = new FormData(form);
      const get = (k: string): string => String(f.get(k) ?? '').trim();
      const kind = form.dataset['form'];
      if (kind === 'status') void act(() => api.patch(url, { status: get('status'), note: get('note') || undefined }), 'Status updated');
      else if (kind === 'progress') void act(() => api.patch(url, { progress: Number(get('progress')), note: get('note') || undefined }), 'Progress saved');
      else if (kind === 'owner') void act(() => api.patch(url, { assignedTo: get('assignedTo') || null }), 'Owner updated');
      else if (kind === 'offer') {
        const amount = Number(get('amount').replace(/,/g, ''));
        const err = form.querySelector<HTMLElement>('[data-err]');
        if (err) err.hidden = true;
        if (!(amount > 0)) {
          if (err) {
            err.textContent = 'Enter the price as a number, for example 2400.';
            err.hidden = false;
          }
          return;
        }
        void act(() => api.post(`${url}/offer`, { amount, currency: get('currency'), summary: get('summary'), validUntil: get('validUntil') || null }), 'Quote sent to the client', err);
      } else if (kind === 'note') {
        const body = get('body');
        if (!body) return;
        void act(() => api.post(`${url}/events`, { body, visibleToClient: f.get('visibleToClient') === 'on' }), f.get('visibleToClient') === 'on' ? 'Note added and shown to the client' : 'Internal note added');
      }
    });
    if (q.conversationId) {
      try {
        await mountChat($$('sdChat'), q.conversationId, ctx);
      } catch (e) {
        $$('sdChat').innerHTML = `<p class="muted pad">Messages are unavailable. ${esc(message(e))}</p>`;
      }
    }
  }

  ctx.onLive((m) => {
    if ((m.type === 'quote' && m.id === q.id) || m.type === 'resync') void reload();
  });
};

export default view;
