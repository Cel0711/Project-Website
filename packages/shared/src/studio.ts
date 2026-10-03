import type { ElementInstance } from './element.js';
import type { CanvasTheme, DeviceKind } from './scene.js';

export type InspectorTab = 'style' | 'layers' | 'page';

/** In-memory editor state for the studio canvas (lives entirely client-side). */
export interface StudioState {
  els: ElementInstance[];
  sel: string | null;
  dev: DeviceKind;
  zoom: number;
  grid: 0 | 1;
  snap: 0 | 1;
  cv: CanvasTheme;
  itab: InspectorTab;
  /** JSON snapshots of `els`, most recent last */
  undo: string[];
  redo: string[];
}

/** What actually gets persisted to localStorage under `cl_studio_v1`. */
export interface StudioSnapshot {
  els: ElementInstance[];
  dev: DeviceKind;
  cv: CanvasTheme;
}

/** A whole-screen starting point offered in the "Presets" palette tab. */
export interface StudioPreset {
  label: string;
  make: () => ElementInstance[];
}

export type PresetRegistry = Record<string, StudioPreset>;

/** [category, label, rendererType, width, height, props?, styleOverride?] */
export type PaletteEntry = readonly [
  category: string,
  label: string,
  type: string,
  w: number,
  h: number,
  props?: Record<string, unknown>,
  styleOverride?: { fill?: string; fill2?: string; grad?: 0 | 1; radius?: number; bw?: number; bc?: string; p?: Record<string, unknown> },
];
