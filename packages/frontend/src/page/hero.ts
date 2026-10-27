import { $, $$ } from '../core/dom.js';
import { paintScene } from '../engine/stage.js';
import { getScene } from '../sections/catalogue/index.js';

/** Paints the dashboard onto the laptop screen once, and numbers its elements so the power-on can stagger them. */
export function buildHero(): void {
  const h = $<HTMLElement>('#heroShot');
  if (!h) return;
  paintScene(h, getScene('execOps'));
  $$<HTMLElement>('.el', h).forEach((el, i) => el.style.setProperty('--i', String(i)));
}

let introRun = 0;

/**
 * Plays the laptop intro: closed laptop -> lid opens -> screen powers on -> content boots.
 * The motion is CSS (main.css, keyed off `data-intro` on .hero-fig); this only restarts it, so it runs
 * every time Home is shown, not just on page load. The screen's content is the same as ever.
 */
export function playHeroIntro(): void {
  const fig = $<HTMLElement>('.hero-fig');
  if (!fig) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
    fig.removeAttribute('data-intro'); // laptop simply stays open
    return;
  }
  const run = ++introRun;
  fig.setAttribute('data-intro', 'pre'); // closed laptop, screen off
  // Give the web fonts a moment (max 400ms) so text on the screen does not reflow mid-animation.
  const fonts: Promise<unknown> = document.fonts ? document.fonts.ready : Promise.resolve();
  const cap = new Promise<void>((resolve) => setTimeout(resolve, 400));
  void Promise.race([fonts, cap]).then(() => {
    if (run !== introRun) return; // a newer visit has already restarted it
    void fig.offsetWidth; // commit "pre" so the animations restart from the top
    requestAnimationFrame(() => {
      if (run === introRun) fig.setAttribute('data-intro', 'play');
    });
  });
}
