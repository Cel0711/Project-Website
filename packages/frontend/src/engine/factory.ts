import type { ElementInstance, ElementProps, ShadowKind } from '@coreloop/shared';
import { uid } from '../core/dom.js';
import { T } from '../renderers/registry.js';

export const SHADOWS: Record<ShadowKind, string> = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,.09)',
  md: '0 8px 22px -10px rgba(0,0,0,.3)',
  lg: '0 24px 54px -22px rgba(0,0,0,.45)',
  inner: 'inset 0 1px 3px rgba(0,0,0,.15)',
};

export interface MkOptions {
  name?: string;
  fill?: string;
  fill2?: string;
  grad?: 0 | 1;
  gdir?: number;
  radius?: number;
  bw?: number;
  bc?: string;
  shadow?: ShadowKind;
  pad?: number;
  p?: ElementProps;
}

/** Builds a fresh ElementInstance from a renderer type + placement + style/prop overrides. */
export function mk(type: string, x: number, y: number, w: number, h: number, o: MkOptions = {}): ElementInstance {
  const d = T[type] || T['panel'];
  const e: ElementInstance = {
    id: uid(),
    type,
    x: Math.round(x || 0),
    y: Math.round(y || 0),
    w: Math.round(w || d?.w || 100),
    h: Math.round(h || d?.h || 100),
    rot: 0,
    op: 1,
    lock: 0,
    hide: 0,
    name: o.name || d?.label || type,
    s: {
      fill: o.fill || '',
      fill2: o.fill2 || '',
      grad: o.grad ? 1 : 0,
      gdir: o.gdir == null ? 160 : o.gdir,
      radius: o.radius == null ? (d?.radius == null ? 6 : d.radius) : o.radius,
      bw: o.bw == null ? d?.bw || 0 : o.bw,
      bc: o.bc || '',
      shadow: o.shadow || d?.shadow || 'none',
      pad: o.pad == null ? d?.pad || 0 : o.pad,
    },
    a: { br: 100, ct: 100, sa: 100, bl: 0, hu: 0 },
    p: {},
  };
  if (d) for (const k in d.p) e.p[k] = d.p[k];
  if (o.p) for (const k2 in o.p) e.p[k2] = o.p[k2];
  return e;
}

/** Convenience wrapper used throughout scenes/presets/palette: (type, x, y, w, h, props, styleOverride). */
export function E(type: string, x: number, y: number, w: number, h: number, p?: ElementProps, st?: Omit<MkOptions, 'p'>): ElementInstance {
  const o: MkOptions = st ? (JSON.parse(JSON.stringify(st)) as MkOptions) : {};
  o.p = p || {};
  return mk(type, x, y, w, h, o);
}

export function boxCss(e: ElementInstance): string {
  const d = T[e.type] || T['panel'];
  const s = e.s, a = e.a;
  const fill = s.fill || (d?.fillVar ? `var(${d.fillVar})` : 'transparent');
  const bg = s.grad ? `linear-gradient(${s.gdir}deg,${fill},${s.fill2 || 'var(--sc-brand)'})` : fill;
  const f: string[] = [];
  if (+a.br !== 100) f.push(`brightness(${a.br}%)`);
  if (+a.ct !== 100) f.push(`contrast(${a.ct}%)`);
  if (+a.sa !== 100) f.push(`saturate(${a.sa}%)`);
  if (+a.bl > 0) f.push(`blur(${a.bl}px)`);
  if (+a.hu !== 0) f.push(`hue-rotate(${a.hu}deg)`);
  return (
    `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;` +
    `background:${bg};border-radius:${s.radius}px;` +
    (+s.bw > 0 ? `border:${s.bw}px solid ${s.bc || 'var(--sc-line)'};` : '') +
    (s.shadow && s.shadow !== 'none' ? `box-shadow:${SHADOWS[s.shadow] || 'none'};` : '') +
    (+s.pad > 0 ? `padding:${s.pad}px;` : '') +
    (+e.rot !== 0 ? `transform:rotate(${e.rot}deg);` : '') +
    (+e.op !== 1 ? `opacity:${e.op};` : '') +
    (f.length ? `filter:${f.join(' ')};` : '') +
    (e.hide ? 'display:none;' : '')
  );
}

export function innerHtml(e: ElementInstance): string {
  const d = T[e.type];
  if (!d) return '';
  try {
    return d.make(e);
  } catch {
    return '';
  }
}

export function renderEl(e: ElementInstance): string {
  return `<div class="el${e.lock ? ' lock' : ''}" data-id="${e.id}" style="${boxCss(e)}">${innerHtml(e)}</div>`;
}
