import type { ElementInstance } from './element.js';

export type CanvasTheme = 'light' | 'dark';

export type DeviceKind = 'desktop' | 'tablet' | 'phone';

/** [width, height] in px, matches the studio's device switcher. */
export const DEVICE_SIZES: Record<DeviceKind, readonly [number, number]> = {
  desktop: [1280, 800],
  tablet: [834, 1112],
  phone: [390, 844],
};

/** A fully-built canvas: fixed size, a canvas theme, and its elements. */
export interface Scene {
  w: number;
  h: number;
  cv: CanvasTheme;
  els: ElementInstance[];
}

/** Lazily builds a Scene; scenes are cached by key after first build. */
export type SceneFactory = () => Scene;

export type SceneRegistry = Record<string, SceneFactory>;
