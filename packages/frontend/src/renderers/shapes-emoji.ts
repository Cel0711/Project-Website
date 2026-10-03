import { esc, round } from '../core/dom.js';
import { def } from './registry-core.js';

/* ============ SHAPES ============ */

type ShapeVariant =
  | 'rect' | 'rrect' | 'circle' | 'ellipse' | 'tri' | 'diamond' | 'hex' | 'star' | 'arrow'
  | 'line' | 'connector' | 'blob' | 'ring' | 'cross' | 'chevron' | 'bracket' | 'plus' | 'pill';

interface ShapeProps { variant: ShapeVariant; stroke: 0 | 1; }
def<ShapeProps>('shape', {
  cat: 'shape', label: 'Shape', w: 120, h: 120, pad: 0, radius: 0, fillVar: '--sc-accent',
  p: { variant: 'rrect', stroke: 0 },
  fields: [['variant', 'Shape', 'sel:rect,rrect,circle,ellipse,tri,diamond,hex,star,arrow,line,connector,blob,ring,cross,chevron,bracket,plus,pill'], ['stroke', 'Outline only', 'chk']],
  make(e) {
    const v = e.p.variant;
    const f = e.s.fill || 'var(--sc-accent)';
    const so = +e.p.stroke;
    const fill = so ? 'none' : f, stroke = so ? f : 'none', sw = so ? 6 : 0;
    const S = (d: string, extra?: string) =>
      '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="' + d + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round" ' + (extra || '') + '/></svg>';
    if (v === 'rect') return S('M0 0H100V100H0Z');
    if (v === 'rrect') return '<div style="width:100%;height:100%;border-radius:12px;' + (so ? 'border:4px solid ' + f : 'background:' + f) + '"></div>';
    if (v === 'pill') return '<div style="width:100%;height:100%;border-radius:999px;' + (so ? 'border:4px solid ' + f : 'background:' + f) + '"></div>';
    if (v === 'circle' || v === 'ellipse') return '<div style="width:100%;height:100%;border-radius:50%;' + (so ? 'border:4px solid ' + f : 'background:' + f) + '"></div>';
    if (v === 'ring') return '<div style="width:100%;height:100%;border-radius:50%;border:14px solid ' + f + '"></div>';
    if (v === 'tri') return S('M50 4 L98 96 H2 Z');
    if (v === 'diamond') return S('M50 2 L98 50 L50 98 L2 50 Z');
    if (v === 'hex') return S('M27 4 H73 L98 50 L73 96 H27 L2 50 Z');
    if (v === 'star') return S('M50 3 L62 36 H97 L69 58 L79 95 L50 73 L21 95 L31 58 L3 36 H38 Z');
    if (v === 'arrow') return S('M2 38 H62 V14 L98 50 L62 86 V62 H2 Z');
    if (v === 'plus') return S('M38 2 H62 V38 H98 V62 H62 V98 H38 V62 H2 V38 H38 Z');
    if (v === 'cross') return '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 8 L92 92 M92 8 L8 92" stroke="' + f + '" stroke-width="12" stroke-linecap="round"/></svg>';
    if (v === 'chevron') return '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 10 L72 50 L28 90" stroke="' + f + '" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (v === 'bracket') return '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M38 6 H10 V94 H38 M62 6 H90 V94 H62" stroke="' + f + '" stroke-width="8" fill="none" stroke-linecap="round"/></svg>';
    if (v === 'line') return '<div style="width:100%;height:100%;display:flex;align-items:center"><span style="width:100%;height:4px;background:' + f + ';border-radius:4px"></span></div>';
    if (v === 'connector') return '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 90 C40 90 60 10 96 10" stroke="' + f + '" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="96" cy="10" r="7" fill="' + f + '"/></svg>';
    if (v === 'blob') return S('M52 3 C78 0 100 18 97 44 C94 70 78 98 50 97 C22 96 3 74 4 46 C5 18 26 6 52 3 Z');
    return S('M0 0H100V100H0Z');
  },
});

/* ============ EMOJI ============ */

interface EmojiProps { char: string; size: number; }
def<EmojiProps>('emoji', {
  cat: 'emoji', label: 'Emoji', w: 64, h: 64, pad: 0, radius: 0,
  p: { char: '📦', size: 0 },
  fields: [['char', 'Emoji', 'text'], ['size', 'Size (0 = fit)', 'num']],
  make(e) {
    const sz = e.p.size > 0 ? e.p.size : Math.max(10, Math.min(e.w, e.h) * 0.78);
    return '<div style="width:100%;height:100%;display:grid;place-items:center;font-size:' + round(sz, 0) + 'px;line-height:1">' + esc(e.p.char) + '</div>';
  },
});
