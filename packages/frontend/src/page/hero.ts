import { $, $$ } from '../core/dom.js';
import { paintScene } from '../engine/stage.js';
import { getScene } from '../sections/catalogue/index.js';

export function buildHero(): void {
  const h = $<HTMLElement>('#heroShot');
  if (!h) return;
  paintScene(h, getScene('execOps'));
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const lidDelay = 1.3; // screen boots up once the laptop lid has finished opening
  const els = $$<HTMLElement>('.el', h);
  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = (el.style.transform || '') + ' translateY(9px)';
    el.style.transition = `opacity .5s ease ${lidDelay + 0.05 + i * 0.055}s, transform .5s cubic-bezier(.2,.9,.3,1) ${lidDelay + 0.05 + i * 0.055}s`;
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      els.forEach((el) => {
        el.style.opacity = '';
        el.style.transform = el.style.transform.replace(' translateY(9px)', '');
      });
    });
  });
}
