import type { ElementInstance } from '@coreloop/shared';
import { $, $$, clamp, esc, toast } from '../core/dom.js';
import { EMOJI, PAL, PAL_CATS } from '../content/palette-data.js';
import { PRESETS } from '../content/presets.js';
import { PROJECTS } from '../content/projects.js';
import { SCENES } from '../content/scenes.js';
import { mk } from '../engine/factory.js';
import { cvPoint, renderCanvas, syncCvTheme, syncDevBtns, zoomFit } from './canvas.js';
import { saveLocal } from './persistence.js';
import { cv, cvWrap, DEV, pushUndo, S, snap } from './state.js';
import { closeDrawers, isNarrow } from './ui-utils.js';

let palCat = 'Presets';
let palQ = '';

export function buildPalCats(): void {
  const h = $<HTMLElement>('#stCats');
  if (!h) return;
  h.innerHTML = PAL_CATS.map((c) => `<button class="st-cat" type="button" data-pc="${esc(c)}" aria-pressed="${c === palCat}">${esc(c)}</button>`).join('');
}

const PALETTE_ICONS: Record<string, string> = {
  panel: '▭', card: '▤', shell: '◫', divider: '—', ribbon: '▦', txt: 'T', bullets: '≔', quote: '❝', price: '$', wordmark: '◈',
  btn: '⬒', btnGroup: '⬓', fab: '✚', ctaBar: '▬', field: '⌷', choice: '☑', kpi: '▲', progress: '▰', gauge: '◔', badge: '●', banner: '!', loader: '◌',
  chart: '📈', pieChart: '◕', map: '🗺', plan: '▩', topology: '⛓', nodeGraph: '⇉', shape: '◆', emoji: '☺', table: '▦', listRows: '≡', kanban: '⫼',
  timeline: '⋮', chat: '💬', calendar: '▤', codeBlock: '⌨', tree: '⌸', wizard: '⟶', pricing: '◫', emptyState: '∅', media: '▣',
  navbar: '▭', sidebarNav: '▯', tabbar: '▂', frame: '▯', posGrid: '▦', cart: '🧾', keypad: '⌗',
};
function palIcon(type: string): string {
  return PALETTE_ICONS[type] || '▫';
}

export function buildPalette(): void {
  const h = $<HTMLElement>('#stItems');
  if (!h) return;
  const q = palQ.trim().toLowerCase();
  let out = '';
  if (q) {
    const hits = PAL.filter((r) => (r[1] + ' ' + r[0]).toLowerCase().indexOf(q) >= 0);
    const pk = Object.keys(PRESETS).filter((k) => (PRESETS[k]?.label ?? '').toLowerCase().indexOf(q) >= 0);
    if (!hits.length && !pk.length) {
      h.innerHTML = '<div class="st-none">Nothing matches that. Try &ldquo;chart&rdquo;, &ldquo;map&rdquo;, &ldquo;button&rdquo; or &ldquo;table&rdquo;.</div>';
      return;
    }
    out += pk.map((k) => `<button class="st-item" type="button" draggable="true" data-preset="${k}"><i>◳</i><b>${esc(PRESETS[k]?.label)}</b></button>`).join('');
    out += hits.map((r) => `<button class="st-item" type="button" draggable="true" data-i="${PAL.indexOf(r)}"><i>${palIcon(r[2])}</i><b>${esc(r[1])}</b></button>`).join('');
    h.innerHTML = out;
    return;
  }
  if (palCat === 'Presets') {
    out += '<div class="st-cat-lbl">Whole screens</div>';
    out += Object.keys(PRESETS).map((k) => `<button class="st-item" type="button" draggable="true" data-preset="${k}"><i>◳</i><b>${esc(PRESETS[k]?.label)}</b></button>`).join('');
    out += '<div class="st-cat-lbl">Start from one of our builds</div>';
    out += PROJECTS.map((p) => `<button class="st-item" type="button" data-build="${p.scene}"><i>◈</i><b>${esc(p.t)}</b></button>`).join('');
    h.innerHTML = out;
    return;
  }
  if (palCat === 'Emoji') {
    h.innerHTML = '<div class="st-cat-lbl">Drag or tap to place</div><div class="st-emoji">' + EMOJI.map((c) => `<button type="button" draggable="true" data-emoji="${esc(c)}" aria-label="Emoji ${esc(c)}">${esc(c)}</button>`).join('') + '</div>';
    return;
  }
  const list = PAL.filter((r) => r[0] === palCat);
  h.innerHTML = list.map((r) => `<button class="st-item" type="button" draggable="true" data-i="${PAL.indexOf(r)}"><i>${palIcon(r[2])}</i><b>${esc(r[1])}</b></button>`).join('');
}

/* ---------- adding elements to the canvas ---------- */

export function centerPoint(): [number, number] {
  const r = cv.getBoundingClientRect();
  const w = cvWrap.getBoundingClientRect();
  const vx = (Math.max(r.left, w.left) + Math.min(r.right, w.right)) / 2;
  const vy = (Math.max(r.top, w.top) + Math.min(r.bottom, w.bottom)) / 2;
  return [(vx - r.left) / S.zoom, (vy - r.top) / S.zoom];
}

export function addFromPal(i: number, x?: number, y?: number): void {
  const r = PAL[i];
  if (!r) return;
  const [, label, type, w, h, props, styleOverride] = r;
  const e = mk(type, 0, 0, w, h, props ? { p: props } : {});
  if (styleOverride) {
    for (const k in styleOverride) {
      if (k === 'p') continue;
      (e.s as unknown as Record<string, unknown>)[k] = (styleOverride as unknown as Record<string, unknown>)[k];
    }
    if (styleOverride.p) for (const k2 in styleOverride.p) e.p[k2] = styleOverride.p[k2];
  }
  e.name = label;
  place(e, x, y);
}

export function addEmoji(ch: string, x?: number, y?: number): void {
  const e = mk('emoji', 0, 0, 72, 72, { p: { char: ch } });
  e.name = 'Emoji ' + ch;
  place(e, x, y);
}

export function place(e: ElementInstance, x?: number, y?: number): void {
  const c = x == null || y == null ? centerPoint() : ([x, y] as [number, number]);
  e.x = snap(clamp(c[0] - e.w / 2, 0, Math.max(0, DEV[S.dev][0] - e.w)));
  e.y = snap(clamp(c[1] - e.h / 2, 0, Math.max(0, DEV[S.dev][1] - e.h)));
  pushUndo();
  S.els.push(e);
  S.sel = e.id;
  S.itab = 'style';
  renderCanvas();
  saveLocal();
}

export function addPreset(key: string, x?: number, y?: number): void {
  const pr = PRESETS[key];
  if (!pr) return;
  const els = pr.make();
  if (x != null && y != null) {
    const minX = Math.min(...els.map((e) => e.x));
    const minY = Math.min(...els.map((e) => e.y));
    const dx = snap(x) - minX, dy = snap(y) - minY;
    els.forEach((e) => { e.x += dx; e.y += dy; });
  }
  pushUndo();
  S.els = S.els.concat(els);
  S.sel = null;
  renderCanvas();
  saveLocal();
  toast(pr.label + ' added — ' + els.length + ' elements you can move and restyle');
}

export function loadBuild(sceneKey: string, quiet?: boolean): void {
  const sc = SCENES[sceneKey];
  if (!sc) return;
  pushUndo();
  const built = sc();
  S.els = JSON.parse(JSON.stringify(built.els));
  S.dev = 'desktop';
  S.cv = built.cv || 'light';
  S.sel = null;
  syncDevBtns();
  renderCanvas();
  zoomFit();
  saveLocal();
  if (!quiet) toast('Loaded into the studio. Change anything, then send it for a quote.');
}

/* ---------- palette drawer wiring: search, categories, drag & drop ---------- */

type DragPayload = { t: 'pal'; i: number } | { t: 'preset'; k: string } | { t: 'emoji'; c: string } | null;
let dragPayload: DragPayload = null;

export function initPalette(): void {
  buildPalCats();
  buildPalette();

  $('#stCats')?.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-pc]');
    if (!b) return;
    palCat = b.getAttribute('data-pc') ?? 'Presets';
    palQ = '';
    const search = $<HTMLInputElement>('#stSearch');
    if (search) search.value = '';
    buildPalCats();
    buildPalette();
    const items = $<HTMLElement>('#stItems');
    if (items) items.scrollTop = 0;
  });
  $<HTMLInputElement>('#stSearch')?.addEventListener('input', function (this: HTMLInputElement) {
    palQ = this.value;
    buildPalette();
  });

  const items = $<HTMLElement>('#stItems');
  if (!items) return;

  items.addEventListener('dragstart', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-i],[data-preset],[data-emoji]');
    if (!b) return;
    dragPayload = b.hasAttribute('data-i')
      ? { t: 'pal', i: +(b.getAttribute('data-i') ?? '0') }
      : b.hasAttribute('data-preset')
        ? { t: 'preset', k: b.getAttribute('data-preset') ?? '' }
        : { t: 'emoji', c: b.getAttribute('data-emoji') ?? '' };
    try {
      (ev as DragEvent).dataTransfer?.setData('text/plain', 'coreloop');
      if ((ev as DragEvent).dataTransfer) (ev as DragEvent).dataTransfer!.effectAllowed = 'copy';
    } catch {
      /* drag data API can throw in some embedded browsers; drag still works without it */
    }
  });
  items.addEventListener('dragend', () => {
    dragPayload = null;
    cvWrap.classList.remove('drop');
  });
  items.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-i],[data-preset],[data-emoji],[data-build]');
    if (!b) return;
    if (b.hasAttribute('data-i')) addFromPal(+(b.getAttribute('data-i') ?? '0'));
    else if (b.hasAttribute('data-preset')) addPreset(b.getAttribute('data-preset') ?? '');
    else if (b.hasAttribute('data-emoji')) addEmoji(b.getAttribute('data-emoji') ?? '');
    else if (b.hasAttribute('data-build')) loadBuild(b.getAttribute('data-build') ?? '');
    if (isNarrow()) closeDrawers();
  });

  cvWrap.addEventListener('dragover', (ev) => {
    if (!dragPayload) return;
    ev.preventDefault();
    cvWrap.classList.add('drop');
  });
  cvWrap.addEventListener('dragleave', (ev) => {
    if (ev.target === cvWrap) cvWrap.classList.remove('drop');
  });
  cvWrap.addEventListener('drop', (ev) => {
    ev.preventDefault();
    cvWrap.classList.remove('drop');
    if (!dragPayload) return;
    const p = cvPoint(ev as DragEvent);
    const d = dragPayload;
    dragPayload = null;
    if (d.t === 'pal') addFromPal(d.i, p[0], p[1]);
    else if (d.t === 'emoji') addEmoji(d.c, p[0], p[1]);
    else if (d.t === 'preset') addPreset(d.k, Math.max(0, p[0]), Math.max(0, p[1]));
  });
}
