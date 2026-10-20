import { $ } from './core/dom.js';
import { fitAllStages } from './engine/stage.js';

// Page chrome that belongs to no single section: nav, theme toggle, hero, footer.
import { applyBrand, initChrome } from './page/chrome.js';
import { buildHero } from './page/hero.js';
import { buildFooterLinks } from './page/footer.js';

// One folder per page section — see src/sections/README.md.
import { buildCaps } from './sections/what-we-build/index.js';
import { closeModal, initCatalogue } from './sections/catalogue/index.js';
import { initStudio } from './sections/design-studio/index.js';
import { loadBuild } from './sections/design-studio/palette-ui.js';
import './sections/how-we-work/index.js';
import { initQuote } from './sections/request-quote/index.js';

function boot(): void {
  applyBrand();
  buildCaps(); //       What we build   → sections/what-we-build
  initCatalogue(); //   Catalogue       → sections/catalogue
  buildFooterLinks();
  initChrome();
  buildHero();
  initStudio(); //      Design studio   → sections/design-studio
  initQuote(); //       Request a quote → sections/request-quote
  //                    How we work     → sections/how-we-work (static, nothing to start)

  // Glue between two sections: the catalogue modal's "Open this in the studio" button.
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
