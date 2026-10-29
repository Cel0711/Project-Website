import { $ } from './core/dom.js';
import { fitAllStages } from './engine/stage.js';

// Page chrome that belongs to no single section: nav + theme toggle, hero, footer, and the router that shows one page at a time.
import { applyBrand, initChrome } from './page/chrome.js';
import { buildHero, playHeroIntro } from './page/hero.js';
import { startHeroBg, stopHeroBg } from './page/hero-bg.js';
import { buildFooterLinks } from './page/footer.js';
import { initReveal } from './page/reveal.js';
import { initRouter, navigate, onEnter, onLeave, onRoute, replaceRoute } from './page/router.js';

// One folder per page section — see src/sections/README.md.
import { buildCaps } from './sections/what-we-build/index.js';
import { closeModal, initCatalogue, openProject } from './sections/catalogue/index.js';
import { initHomePreviews } from './sections/home-previews/index.js';
import { initStudio } from './sections/design-studio/index.js';
import { zoomFit } from './sections/design-studio/canvas.js';
import { updateAttachState } from './sections/design-studio/ui-utils.js';
import { loadBuild } from './sections/design-studio/palette-ui.js';
import './sections/how-we-work/index.js';
import { initQuote } from './sections/request-quote/index.js';
import { initAuthModal, openAuth } from './sections/auth-modal/index.js';
import { initNavAccount } from './sections/auth-modal/nav.js';
import './sections/cta-band/index.js';

function boot(): void {
  applyBrand();
  buildCaps(); //         What we build   → sections/what-we-build  (page #/services)
  initCatalogue(); //     Catalogue       → sections/catalogue      (page #/work)
  buildFooterLinks();
  initChrome();
  buildHero();
  initHomePreviews(); //  Home previews   → sections/home-previews  (page #/)
  initStudio(); //        Design studio   → sections/design-studio  (page #/studio)
  // Request a quote → sections/request-quote (page #/contact). A visitor who is not signed in gets the sign-in box first.
  initQuote({
    mode: 'landing',
    requireSignIn: () => openAuth('signin', { message: 'Sign in or create a free account to send your request. What you typed is kept.', stay: true }),
  });
  initAuthModal(); //     Sign in / up    → sections/auth-modal     (box over any page: #/login, #/signup)
  initNavAccount(); //    Nav "Sign in" button / account chip       (sections/auth-modal/nav.ts)
  //                      How we work     → sections/how-we-work    (page #/process, static, nothing to start)

  // Glue between two sections: the catalogue modal's "Open this in the studio" button.
  $('#mOpen')?.addEventListener('click', function (this: HTMLElement) {
    const k = this.getAttribute('data-scene');
    closeModal();
    if (k) loadBuild(k);
    navigate('studio');
  });

  // Pages that are hidden while the site loads measure 0px wide, so anything sized from its container
  // (rendered screens, the studio canvas) is fitted again whenever a page is shown.
  onEnter('*', () => {
    fitAllStages();
    requestAnimationFrame(fitAllStages);
  });
  onEnter('studio', () => zoomFit());
  onEnter('contact', () => updateAttachState());
  // The laptop opens (and the rings start) every time Home is shown; nothing runs for a hidden page.
  onEnter('home', () => {
    playHeroIntro();
    startHeroBg();
  });
  onLeave('home', () => stopHeroBg());
  // #/work/WRK-07 shows that build's detail modal over the catalogue; any other route closes it.
  onRoute((route) => {
    if (route.page === 'work' && route.param) {
      if (!openProject(route.param)) replaceRoute('work');
    } else closeModal();
  });

  initReveal(); //        scroll-in entrance animations for the elements listed in page/reveal.ts

  initRouter(); // last: its first render runs the hooks above
  setTimeout(fitAllStages, 200);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
