import { $, esc } from '../core/dom.js';
import { PROJECTS } from '../sections/catalogue/projects.js';

/** The footer's "Work" column: plain links to a build's own URL; the router opens the modal. */
export function buildFooterLinks(): void {
  const h = $<HTMLElement>('#fWork');
  if (!h) return;
  h.innerHTML = PROJECTS.slice(0, 6).map((p) => `<li><a href="#/work/${encodeURIComponent(p.id)}">${esc(p.t)}</a></li>`).join('');
}
