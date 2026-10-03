import { $ } from './core/dom.js';
import { fitAllStages } from './engine/stage.js';
import { applyBrand, initChrome } from './page/chrome.js';
import { buildCaps, buildFilters, buildFooterLinks, buildHero, buildWork, closeModal } from './page/catalogue.js';
import { initQuote } from './quote/index.js';
import { loadBuild } from './studio/palette-ui.js';
import { initStudio } from './studio/index.js';

function boot(): void {
  applyBrand();
  buildCaps();
  buildFilters();
  buildWork();
  buildFooterLinks();
  initChrome();
  buildHero();
  initStudio();
  initQuote();

  $('#mOpen')?.addEventListener('click', function (this: HTMLElement) {
    const k = this.getAttribute('data-scene');
    closeModal();
    if (k) loadBuild(k);
    $('#studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  setTimeout(fitAllStages, 200);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
