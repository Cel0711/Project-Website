// Section: Request a quote (page #/contact, and "Get a quote" inside the portal) — contact details, plan chooser and the quote form.
// Markup: request-quote.html + quote-form.html · Styles: request-quote.css · Form fields/plans: form.ts · Backend call: api-client.ts · No-backend fallback: fallback.ts
import { CURRENCIES, isCurrency, type CurrencyCode, type PublicUser, type QuoteRecord, type QuoteRequestPayload } from '@coreloop/shared';
import { ApiRequestError } from '../../api/client.js';
import { guessCurrency } from '../../auth/locale.js';
import { currentUser, onSession } from '../../auth/session.js';
import { CFG } from '../../config.js';
import { $, toast } from '../../core/dom.js';
import { updateAttachState } from '../design-studio/ui-utils.js';
import { submitQuote } from './api-client.js';
import { saveDesignFile } from './fallback.js';
import { briefText, buildKinds, buildPlans, designPayload, readForm } from './form.js';
import './request-quote.css';

export interface QuoteOptions {
  /** 'portal' = the signed-in "Get a quote" screen: after sending it hands over to `onSent` instead of showing the panel. */
  mode?: 'landing' | 'portal';
  /** Landing only: opens the sign-in box and resolves with the user once they are in (null if they close it). */
  requireSignIn?: () => Promise<PublicUser | null>;
  onSent?: (quote: QuoteRecord) => void;
}

let lastBrief = '';
let lastFile = '';

function fillCurrency(): { touched: () => boolean } {
  const sel = $<HTMLSelectElement>('#qCur');
  let touched = false;
  if (sel) {
    sel.innerHTML = CURRENCIES.map((c) => `<option value="${c.code}">${c.code} · ${c.name}</option>`).join('');
    sel.value = currentUser()?.currency ?? guessCurrency();
    sel.addEventListener('change', () => (touched = true));
  }
  return { touched: () => touched };
}

/** Fills in who the visitor is, once, without overwriting anything they have already typed. */
function prefill(user: PublicUser | null, currencyTouched: boolean): void {
  if (!user) return;
  const set = (sel: string, v: string): void => {
    const el = $<HTMLInputElement>(sel);
    if (el && !el.value && v) el.value = v;
  };
  set('#qName', user.fullName);
  set('#qEmail', user.email);
  set('#qCompany', user.company);
  set('#qPhone', user.phone);
  const cur = $<HTMLSelectElement>('#qCur');
  if (cur && !currencyTouched) cur.value = user.currency;
}

function showSent(q: QuoteRecord): void {
  const out = $<HTMLElement>('#sendOut');
  out?.classList.add('open');
  const title = $('#soTitle');
  if (title) title.textContent = `Request ${q.ref} received`;
  const msg = $('#soMsg');
  if (msg) msg.textContent = 'Thank you. We reply within one business day. You can follow every step, and message us, from your dashboard.';
  const track = $<HTMLAnchorElement>('#soTrack');
  if (track) {
    track.href = `/portal/#/requests/${encodeURIComponent(q.ref)}`;
    track.hidden = false;
  }
  $<HTMLElement>('#soMail')?.setAttribute('hidden', '');
  $<HTMLElement>('#soCopy')?.setAttribute('hidden', '');
  out?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** The server could not be reached: the visitor keeps the old ways of sending it (email, copy, download). */
function showFallback(reason: string): void {
  const out = $<HTMLElement>('#sendOut');
  out?.classList.add('open');
  const title = $('#soTitle');
  if (title) title.textContent = 'We could not send it from here';
  const msg = $('#soMsg');
  if (msg) msg.textContent = `${reason} Send it by email instead, or copy it. If you drew something, download the design file and attach it.`;
  $<HTMLElement>('#soTrack')?.setAttribute('hidden', '');
  $<HTMLElement>('#soMail')?.removeAttribute('hidden');
  $<HTMLElement>('#soCopy')?.removeAttribute('hidden');
  out?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function initQuote(opts: QuoteOptions = {}): void {
  const portal = opts.mode === 'portal';
  buildKinds();
  buildPlans();
  const currency = fillCurrency();
  prefill(currentUser(), currency.touched());
  if (!portal) onSession((s) => prefill(s.user, currency.touched())); // signing in from the box fills the form in

  const form = $<HTMLFormElement>('#quoteForm');
  const submitBtn = $<HTMLButtonElement>('#qSubmit');
  let busy = false;
  // After a successful send the button rests until something changes, so a double click cannot send it twice.
  form?.addEventListener('input', () => {
    if (submitBtn?.dataset['sent']) {
      delete submitBtn.dataset['sent'];
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send request';
    }
  });

  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const f = readForm();
    if (!f.name) {
      $<HTMLInputElement>('#qName')?.focus();
      toast('Add your name so we know who to reply to');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) {
      $<HTMLInputElement>('#qEmail')?.focus();
      toast('Check the email address — that is where the quote goes');
      return;
    }
    if (!f.notes && !f.attach) {
      $<HTMLTextAreaElement>('#qNotes')?.focus();
      toast('Tell us a little about the problem, or attach a design');
      return;
    }

    // Requests belong to a client account, so a visitor who is not signed in does that first (what they typed stays on the page).
    let user = currentUser();
    if (!user && opts.requireSignIn) {
      user = await opts.requireSignIn();
      if (!user) return;
    }
    if (!user) {
      location.assign('/#/login');
      return;
    }
    if (user.role !== 'client') {
      toast('Team accounts manage requests from the dashboard. Sign in with a client account to send one.');
      return;
    }
    if (!user.emailVerified) {
      toast('Please confirm your email address first. We sent you a link when you signed up.');
      return;
    }

    // Read the form only now: signing in may have filled in the contact details and the account's currency.
    const sent = readForm();
    lastBrief = briefText(sent);
    const chosen = $<HTMLSelectElement>('#qCur')?.value;
    const payload: QuoteRequestPayload = {
      name: sent.name, company: sent.company, email: sent.email, phone: sent.phone,
      planId: sent.planId, planName: sent.planName, kinds: sent.kinds, budget: sent.budget, timeline: sent.timeline, notes: sent.notes,
      currency: isCurrency(chosen) ? (chosen as CurrencyCode) : undefined,
      design: sent.attach ? designPayload() : null,
      sentAt: new Date().toISOString(),
    };
    lastFile = JSON.stringify({ request: { name: payload.name, company: payload.company, email: payload.email, phone: payload.phone, plan: payload.planId, planName: payload.planName, kinds: payload.kinds, budget: payload.budget, timeline: payload.timeline, notes: payload.notes, currency: payload.currency }, design: payload.design, sentAt: payload.sentAt }, null, 2);

    const subj = `Quote request — ${sent.planName || 'project'} — ${sent.name}${sent.company ? ` (${sent.company})` : ''}`;
    const body = lastBrief.length > 1700 ? lastBrief.slice(0, 1700) + '\n\n[Trimmed for email. Use "Download design file" and attach it.]' : lastBrief;
    const mailLink = $<HTMLAnchorElement>('#soMail');
    if (mailLink) mailLink.href = `mailto:${encodeURIComponent(CFG.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;

    busy = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }
    try {
      const quote = await submitQuote(payload);
      if (submitBtn) {
        submitBtn.dataset['sent'] = '1';
        submitBtn.textContent = 'Request sent';
      }
      if (opts.onSent) opts.onSent(quote);
      else showSent(quote);
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send request';
      }
      if (err instanceof ApiRequestError && err.status > 0 && err.status < 500 && err.status !== 429) {
        // The server understood and said no (signed out, a field is wrong): tell them, keep the form.
        toast(err.status === 401 ? 'Your session ended. Please sign in again and press Send.' : err.fieldMessage('email') ?? err.message);
        if (err.status === 401 && opts.requireSignIn) void opts.requireSignIn();
      } else {
        showFallback(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
      }
    } finally {
      busy = false;
    }
  });

  $('#soCopy')?.addEventListener('click', () => {
    const txt = lastBrief || '';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(
        () => toast('Brief copied — paste it into an email to ' + CFG.email),
        () => toast('Could not copy. Select the text in your email app instead.'),
      );
    } else toast('Copying is not available in this browser');
  });
  $('#soFile')?.addEventListener('click', () => saveDesignFile(lastFile, 'quote-request.json'));
  $('#qAttach')?.addEventListener('change', updateAttachState);
}
