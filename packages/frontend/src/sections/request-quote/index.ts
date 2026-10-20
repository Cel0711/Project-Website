// Section: Request a quote (#quote) — contact details, plan chooser and the quote form.
// Markup: request-quote.html · Styles: request-quote.css · Form fields/plans: form.ts · Backend call: api-client.ts · No-backend fallback: fallback.ts
import type { QuoteRequestPayload } from '@coreloop/shared';
import { $, toast } from '../../core/dom.js';
import { CFG } from '../../config.js';
import { submitQuote } from './api-client.js';
import { saveDesignFile } from './fallback.js';
import { briefText, buildKinds, buildPlans, designPayload, readForm } from './form.js';
import { updateAttachState } from '../design-studio/ui-utils.js';
import './request-quote.css';

let lastBrief = '';
let lastFile = '';

export function initQuote(): void {
  buildKinds();
  buildPlans();

  $<HTMLFormElement>('#quoteForm')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
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

    lastBrief = briefText(f);
    const payload: QuoteRequestPayload = {
      name: f.name, company: f.company, email: f.email, phone: f.phone,
      planId: f.planId, planName: f.planName, kinds: f.kinds, budget: f.budget, timeline: f.timeline, notes: f.notes,
      design: f.attach ? designPayload() : null,
      sentAt: new Date().toISOString(),
    };
    lastFile = JSON.stringify({ request: { name: payload.name, company: payload.company, email: payload.email, phone: payload.phone, plan: payload.planId, planName: payload.planName, kinds: payload.kinds, budget: payload.budget, timeline: payload.timeline, notes: payload.notes }, design: payload.design, sentAt: payload.sentAt }, null, 2);

    const subj = `Quote request — ${f.planName || 'project'} — ${f.name}${f.company ? ` (${f.company})` : ''}`;
    const body = lastBrief.length > 1700 ? lastBrief.slice(0, 1700) + '\n\n[Trimmed for email. Use "Download design file" and attach it.]' : lastBrief;
    const mailLink = $<HTMLAnchorElement>('#soMail');
    if (mailLink) mailLink.href = `mailto:${encodeURIComponent(CFG.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;

    const out = $<HTMLElement>('#sendOut');
    out?.classList.add('open');
    const soTitle = $<HTMLElement>('#soTitle');
    if (soTitle) soTitle.textContent = `Ready to send — ${f.planName || 'your request'}`;
    const soMsg = $<HTMLElement>('#soMsg');
    if (soMsg) soMsg.textContent = 'Open your email app with everything filled in, or copy the brief. If you drew something, download the design file and attach it.';
    out?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Fire-and-forget: the email/copy/download routes above already work
    // with no backend, so a failed or slow API call must never block them.
    void submitQuote(payload).then((record) => {
      if (record && soMsg) soMsg.textContent = 'Logged in our inbox. You can also open your email app below, or download the design file for your own records.';
    });
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
