import { $$ } from '../core/dom.js';

/**
 * Scroll-in entrance animations. Elements matching TARGETS start hidden and play a short CSS animation
 * (main.css, "scroll reveal") each time they scroll into view, sliding in from a random side (left, right
 * or up, picked fresh on every play). They reset when they leave, so scrolling back replays them.
 * Items that arrive together (a row of cards) are staggered.
 *
 * Without JS, or with reduced motion, nothing is marked and everything is simply visible: the hidden
 * state only applies under `html.rv-on`, which is set at the very end of init.
 */

/** Selectors for the elements that animate (not their containers). */
const TARGETS = [
  '.hero-grid > div:first-child > *',
  '.hero-meta > div',
  '.pagehead .wrap > *',
  '.sec-head > *',
  '.caps > *',
  '.work-grid > *',
  '.filters',
  '.steps > *',
  '.hp-more',
  '.hp-studio > .btn',
  '.ctaband-in > *',
  '.contact-list > *',
  '.q-grid .form',
  '.studio-sec .studio',
];

/** The entrances to pick from; each has an rv* keyframe in main.css. */
const DIRECTIONS = ['left', 'right', 'up'] as const;

/** Containers whose children are rebuilt at runtime (catalogue filters), so new children are picked up. */
const LIVE_HOSTS = '.caps, .work-grid, .steps';

const STAGGER_MS = 70;
const MAX_STAGGER = 8;

export function initReveal(): void {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  const io = new IntersectionObserver(
    (entries) => {
      let i = 0;
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) {
          el.dataset['reveal'] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]!;
          el.style.setProperty('--rv-d', Math.min(i++, MAX_STAGGER) * STAGGER_MS + 'ms');
          el.classList.add('rv-in');
        } else {
          el.classList.remove('rv-in'); // off screen (or its page is hidden): arm it to play again
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );

  const scan = (): void => {
    for (const sel of TARGETS) {
      $$<HTMLElement>(sel).forEach((el) => {
        if (el.dataset['reveal']) return;
        el.dataset['reveal'] = 'up'; // placeholder so it starts hidden; a random direction is picked when it enters
        io.observe(el);
      });
    }
  };

  scan();
  const mo = new MutationObserver(scan);
  $$<HTMLElement>(LIVE_HOSTS).forEach((h) => mo.observe(h, { childList: true }));

  document.documentElement.classList.add('rv-on');
}
