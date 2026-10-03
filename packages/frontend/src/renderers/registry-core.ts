import type { RendererDef, RendererRegistry } from '@coreloop/shared';

/**
 * The single renderer map, populated by side-effect imports of each
 * category module (see registry.ts). Kept as one mutable object — exactly
 * like the original `T`/`def()` — because the studio, the catalogue and
 * the palette all need to resolve a type name to its renderer at runtime.
 */
export const T: RendererRegistry = {};

export function def<P>(key: string, renderer: RendererDef<P>): void {
  T[key] = renderer as unknown as RendererDef;
}
