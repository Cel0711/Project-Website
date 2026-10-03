import type { ElementInstance } from '@coreloop/shared';

/** Inner content width/height once the element's own padding is subtracted. Used by chart/pieChart/plan/topology renderers. */
export function iw(e: ElementInstance): number {
  return Math.max(30, e.w - 2 * (e.s.pad || 0));
}
export function ih(e: ElementInstance): number {
  return Math.max(24, e.h - 2 * (e.s.pad || 0));
}
