// Section: What we build (#build) — the six capability cards.
// Markup: what-we-build.html · Styles: what-we-build.css · Data: caps.ts (edit the cards there)
import { $, esc } from '../../core/dom.js';
import { CAPS } from './caps.js';
import './what-we-build.css';

export function buildCaps(): void {
  const h = $<HTMLElement>('#caps');
  if (!h) return;
  h.innerHTML = CAPS.map((c) =>
    `<article class="cap"><span class="cap-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${c.ic}"/></svg></span>` +
    `<h3>${esc(c.t)}</h3><p>${esc(c.d)}</p><ul>${c.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></article>`,
  ).join('');
}
