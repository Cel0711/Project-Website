/**
 * Domain model for a single placed element on the canvas (studio) or a scene
 * (catalogue screenshot). Mirrors the runtime shape built by `mk()` in the
 * original single-file site, now given a name and a type.
 */

export type ShadowKind = 'none' | 'sm' | 'md' | 'lg' | 'inner';

export interface ElementStyle {
  fill: string;
  fill2: string;
  grad: 0 | 1;
  gdir: number;
  radius: number;
  bw: number;
  bc: string;
  shadow: ShadowKind;
  pad: number;
}

export interface ElementAdjustments {
  /** brightness % */
  br: number;
  /** contrast % */
  ct: number;
  /** saturation % */
  sa: number;
  /** blur px */
  bl: number;
  /** hue-rotate deg */
  hu: number;
}

/**
 * Free-form per-renderer props (button label, chart variant, table kind, ...).
 * Each renderer defines its own shape; kept loose here so the registry stays
 * a single generic map instead of ~50 discriminated members.
 */
export type ElementProps = Record<string, unknown>;

export interface ElementInstance {
  id: string;
  /** key into the renderer registry, e.g. 'btn', 'chart', 'kpi' */
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** degrees */
  rot: number;
  /** opacity 0..1 */
  op: number;
  lock: 0 | 1;
  hide: 0 | 1;
  name: string;
  s: ElementStyle;
  a: ElementAdjustments;
  p: ElementProps;
}

export const DEFAULT_ADJUSTMENTS: ElementAdjustments = { br: 100, ct: 100, sa: 100, bl: 0, hu: 0 };

export function isElementAdjusted(a: ElementAdjustments): boolean {
  return a.br !== 100 || a.ct !== 100 || a.sa !== 100 || a.bl > 0 || a.hu !== 0;
}

/** Renderer categories, used to group the palette in the studio sidebar. */
export type RendererCategory =
  | 'layout'
  | 'text'
  | 'button'
  | 'input'
  | 'indicator'
  | 'chart'
  | 'map'
  | 'shape'
  | 'emoji'
  | 'data'
  | 'media'
  | 'nav'
  | 'frame';

/** One editable field surfaced in the inspector for a renderer's props. */
export type FieldKind = 'text' | 'area' | 'num' | 'chk' | `sel:${string}`;

/** [propKey, label, fieldKind] */
export type FieldDef = readonly [key: string, label: string, kind: FieldKind];

/**
 * A renderer definition: the palette entry (default size/props) plus the
 * pure function that turns an ElementInstance into inner HTML/SVG markup.
 * `P` is the renderer's own props shape when a caller wants it typed.
 *
 * Deliberately unconstrained (not `P extends ElementProps`): each renderer
 * declares `p` as a plain interface with named fields, e.g.
 * `interface PanelProps { pattern: string }`. Plain interfaces have no
 * index signature, so they don't structurally satisfy `Record<string,
 * unknown>` as a generic constraint even though every field is a valid
 * unknown — constraining P would force every renderer to add a throwaway
 * `[key: string]: unknown` just to compile.
 */
export interface RendererDef<P = ElementProps> {
  cat: RendererCategory;
  label: string;
  w: number;
  h: number;
  fillVar?: string;
  radius?: number;
  bw?: number;
  pad?: number;
  shadow?: ShadowKind;
  p: P;
  fields: FieldDef[];
  make: (e: ElementInstance & { p: P }) => string;
}

/** The full registry, keyed by renderer type. */
export type RendererRegistry = Record<string, RendererDef>;
