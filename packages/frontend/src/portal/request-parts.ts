import { QUOTE_STATUS_LABEL, type QuoteEvent, type QuoteRecord } from '@coreloop/shared';
import { esc } from '../core/dom.js';
import { downloadJson, renderDesign } from './design-preview.js';
import { ago, badge, card, fmtDate, fmtDateTime } from './ui.js';

/** Pieces of a request screen that the client and the team both show. */

function eventTitle(e: QuoteEvent, staff: boolean): string {
  switch (e.kind) {
    case 'status':
      return e.toStatus ? QUOTE_STATUS_LABEL[e.toStatus] : 'Status changed';
    case 'progress':
      return `Progress ${e.progress ?? 0}%`;
    case 'offer':
      return 'Quote sent';
    case 'note':
      return staff ? 'Note' : 'Update from the team';
    default:
      return 'Team note';
  }
}

/** The story of a request, newest first. Team-only notes carry a "Team only" tag and never reach a client. */
export function timeline(events: QuoteEvent[], staff: boolean): string {
  if (!events.length) return '<p class="muted">Nothing yet.</p>';
  return `<ol class="tl">${[...events]
    .reverse()
    .map((e) => {
      const who = e.actor ? esc(e.actor.fullName) + (e.actor.role && e.actor.role !== 'client' && !staff ? ' · Lab-Lace team' : '') : 'System';
      return (
        `<li class="tl-i k-${e.kind}${e.visibleToClient ? '' : ' internal'}"><span class="tl-dot"></span><div class="tl-b">` +
        `<div class="tl-h"><b>${esc(eventTitle(e, staff))}</b>${e.visibleToClient ? '' : badge('Team only', 'neutral')}</div>` +
        (e.body ? `<p>${esc(e.body)}</p>` : '') +
        `<time title="${esc(fmtDateTime(e.createdAt))}">${who} · ${esc(ago(e.createdAt))}</time></div></li>`
      );
    })
    .join('')}</ol>`;
}

function row(label: string, value: string): string {
  return `<div><dt>${esc(label)}</dt><dd>${value || '<span class="muted">—</span>'}</dd></div>`;
}

export function detailsCard(q: QuoteRecord): string {
  return card(
    'The request',
    `<dl class="dl">` +
      row('Sent', esc(fmtDateTime(q.createdAt))) +
      row('Quote currency', esc(q.currency)) +
      row('Plan', esc(q.planName ?? '')) +
      row('Work needed', esc(q.kinds.join(', '))) +
      row('Budget', esc(q.budget)) +
      row('Timeline', esc(q.timeline)) +
      row('Contact', [q.contact.name, q.contact.company].filter(Boolean).map(esc).join(' · ')) +
      row('Email', q.contact.email ? `<a href="mailto:${esc(q.contact.email)}">${esc(q.contact.email)}</a>` : '') +
      row('Phone', esc(q.contact.phone)) +
      `</dl>` +
      (q.notes ? `<h3 class="sub">What happens today, and what should happen instead</h3><p class="prewrap">${esc(q.notes)}</p>` : ''),
  );
}

export function designCard(q: QuoteRecord): string {
  if (!q.design) return '';
  return card(
    `Attached design <span class="muted">· ${q.design.count} element${q.design.count === 1 ? '' : 's'}, ${esc(q.design.device)}</span>`,
    `<div class="m-shot design-shot" data-design></div>`,
    '<button class="btn btn-line btn-sm" type="button" data-design-download>Download design file</button>',
  );
}

/** Draws the attached design and wires the download button; call after the HTML above is in the page. */
export function mountDesign(root: HTMLElement, q: QuoteRecord): void {
  const host = root.querySelector<HTMLElement>('[data-design]');
  if (!host || !q.design) return;
  renderDesign(host, q.design);
  root.querySelector('[data-design-download]')?.addEventListener('click', () => downloadJson(`${q.ref}-design.json`, { design: q.design, request: q.ref }));
}

export function offerCard(q: QuoteRecord, actions: string): string {
  if (!q.offer) return '';
  const o = q.offer;
  return `<section class="pcard offer"><header class="pcard-h"><h2>Quote</h2><span class="muted">sent ${esc(fmtDate(o.sentAt))}</span></header><div class="pcard-b">
    <div class="offer-amt" data-amount>${esc(new Intl.NumberFormat('en-US', { style: 'currency', currency: o.currency }).format(Number(o.amount)))}<small>fixed price</small></div>
    <p class="prewrap">${esc(o.summary)}</p>
    ${o.validUntil ? `<p class="muted">Valid until ${esc(fmtDate(o.validUntil))}</p>` : ''}
    ${actions ? `<div class="offer-act">${actions}</div>` : ''}</div></section>`;
}
