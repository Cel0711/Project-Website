import { DEVICE_SIZES, type CanvasTheme, type DeviceKind, type ElementInstance, type InspectorTab } from '@coreloop/shared';
import { $ } from '../core/dom.js';

export const DEV = DEVICE_SIZES;

export interface StudioMutableState {
  els: ElementInstance[];
  sel: string | null;
  dev: DeviceKind;
  zoom: number;
  grid: 0 | 1;
  snap: 0 | 1;
  cv: CanvasTheme;
  itab: InspectorTab;
  undo: string[];
  redo: string[];
}

export const S: StudioMutableState = { els: [], sel: null, dev: 'desktop', zoom: 1, grid: 1, snap: 1, cv: 'light', itab: 'style', undo: [], redo: [] };

/** Canvas DOM refs, set once by initStudio() (see studio/index.ts) and read by every other studio module. */
export let cv!: HTMLElement;
export let cvWrap!: HTMLElement;
export let cvEmpty!: HTMLElement;

export function setCanvasRefs(host: HTMLElement, wrap: HTMLElement, empty: HTMLElement): void {
  cv = host;
  cvWrap = wrap;
  cvEmpty = empty;
}

export function snap(n: number): number {
  return S.snap ? Math.round(n / 8) * 8 : Math.round(n);
}

export function findEl(id: string | null): ElementInstance | null {
  if (id == null) return null;
  for (let i = 0; i < S.els.length; i++) if (S.els[i]?.id === id) return S.els[i] ?? null;
  return null;
}

export function selEl(): ElementInstance | null {
  return S.sel ? findEl(S.sel) : null;
}

export function snapshot(): string {
  return JSON.stringify(S.els);
}

export function updateUndoBtns(): void {
  const u = $<HTMLButtonElement>('#undoBtn');
  const r = $<HTMLButtonElement>('#redoBtn');
  if (u) u.disabled = !S.undo.length;
  if (r) r.disabled = !S.redo.length;
}

export function pushUndo(): void {
  S.undo.push(snapshot());
  if (S.undo.length > 60) S.undo.shift();
  S.redo.length = 0;
  updateUndoBtns();
}
