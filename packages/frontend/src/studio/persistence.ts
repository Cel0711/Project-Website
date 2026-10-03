import type { StudioSnapshot } from '@coreloop/shared';
import { $ } from '../core/dom.js';
import { DEV, S } from './state.js';

const STORAGE_KEY = 'cl_studio_v1';

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Debounced autosave to localStorage — nothing is sent anywhere until the visitor presses send. */
export function saveLocal(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const snapshot: StudioSnapshot = { els: S.els, dev: S.dev, cv: S.cv };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      const n = $<HTMLElement>('#stSaved');
      if (n) n.textContent = 'Saved in this browser · ' + new Date().toLocaleTimeString();
    } catch {
      const n2 = $<HTMLElement>('#stSaved');
      if (n2) n2.textContent = 'Not saved locally (storage is off)';
    }
  }, 500);
}

export function loadLocal(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw) as Partial<StudioSnapshot> | null;
    if (!o || !o.els || !o.els.length) return false;
    S.els = o.els;
    S.dev = o.dev && DEV[o.dev] ? o.dev : 'desktop';
    S.cv = o.cv === 'dark' ? 'dark' : 'light';
    return true;
  } catch {
    return false;
  }
}
