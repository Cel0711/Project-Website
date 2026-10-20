import { $, esc } from '../core/dom.js';
import { openProject } from '../sections/catalogue/index.js';
import { PROJECTS } from '../sections/catalogue/projects.js';

export function buildFooterLinks(): void {
  const h = $<HTMLElement>('#fWork');
  if (!h) return;
  h.innerHTML = PROJECTS.slice(0, 6).map((p) => `<li><a href="#work" data-open="${p.id}">${esc(p.t)}</a></li>`).join('');
  h.addEventListener('click', (ev) => {
    const a = (ev.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (!a) return;
    ev.preventDefault();
    openProject(a.getAttribute('data-open') ?? '');
  });
}
