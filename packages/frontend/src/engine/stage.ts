import type { Scene } from '@coreloop/shared';
import { $$ } from '../core/dom.js';
import { renderEl } from './factory.js';

/** Paints a whole Scene (fixed-size canvas) into a host element, then scales it to fit. */
export function paintScene(host: HTMLElement, sc: Scene, minScale?: number): void {
  host.innerHTML =
    `<div class="stage" data-sw="${sc.w}" data-sh="${sc.h}"${minScale ? ` data-min="${minScale}"` : ''}` +
    ` data-cv="${sc.cv || 'light'}" style="width:${sc.w}px;height:${sc.h}px;background:var(--sc-bg)">` +
    sc.els.map(renderEl).join('') +
    '</div>';
  fitStage(host);
}

export function fitStage(host: HTMLElement): void {
  const st = host.querySelector<HTMLElement>('.stage');
  if (!st) return;
  const sw = +(st.getAttribute('data-sw') || '0');
  const sh = +(st.getAttribute('data-sh') || '0');
  const min = parseFloat(st.getAttribute('data-min') || '0');
  const aw = host.clientWidth || sw;
  let k = aw / sw;
  if (min && k < min) k = min;
  st.style.transform = `scale(${k})`;
  host.style.height = Math.round(sh * k) + 'px';
}

export function fitAllStages(): void {
  $$<HTMLElement>('.m-shot,.plate-shot').forEach((h) => {
    if (h.querySelector('.stage')) fitStage(h);
  });
}
