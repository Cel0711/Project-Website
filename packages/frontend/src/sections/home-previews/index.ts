// Section: Home previews — short teasers under the hero on Home; each one has a button to its full page.
// Markup: home-previews.html · Styles: home-previews.css
// Reuses the real renderers instead of copying content: capability cards (what-we-build), plates (catalogue)
// and the stage titles, which are read from the How we work page so the two can never drift apart.
import { $, $$ } from '../../core/dom.js';
import { CAPS } from '../what-we-build/caps.js';
import { capCardHtml } from '../what-we-build/index.js';
import { buildWorkPreview } from '../catalogue/index.js';
import './home-previews.css';

/** Which builds the Home page shows (ids from catalogue/projects.ts): one each of AI, dashboards and enterprise systems. */
const FEATURED_BUILDS = ['WRK-01', 'WRK-07', 'WRK-04'];

export function initHomePreviews(): void {
  const caps = $<HTMLElement>('#hpCaps');
  if (caps) caps.innerHTML = CAPS.slice(0, 3).map(capCardHtml).join('');

  const work = $<HTMLElement>('#hpWork');
  if (work) buildWorkPreview(work, FEATURED_BUILDS);

  const steps = $<HTMLElement>('#hpSteps');
  if (steps) {
    steps.innerHTML = $$<HTMLElement>('#process .step')
      .map((s) => `<li class="step"><span class="step-n">${s.querySelector('.step-n')?.innerHTML ?? ''}</span><h3>${s.querySelector('h3')?.innerHTML ?? ''}</h3></li>`)
      .join('');
  }
}
