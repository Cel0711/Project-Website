import { $ } from '../../core/dom.js';
import { S } from './state.js';

/** Small cross-cutting DOM helpers shared by the palette/inspector drawers, the toolbar and the quote form — kept dependency-free to avoid circular imports between those modules. */

export function closeDrawers(): void {
  $('#pal')?.classList.remove('open');
  $('#insp')?.classList.remove('open');
}

export function isNarrow(): boolean {
  return matchMedia('(max-width:920px)').matches;
}

export function updateAttachState(): void {
  const n = $<HTMLElement>('#attachState');
  if (!n) return;
  n.textContent = S.els.length ? `${S.els.length} elements on your ${S.dev} canvas will be attached` : 'Nothing drawn yet — the design studio is optional.';
}
