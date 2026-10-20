import type { ElementInstance } from '@coreloop/shared';
import { $, $$, clamp, esc } from '../../core/dom.js';
import { T } from '../../renderers/registry.js';
import { refreshEl, renderCanvas, syncCvTheme, syncDevBtns, syncToggles, zoomFit } from './canvas.js';
import { saveLocal } from './persistence.js';
import { cv, DEV, pushUndo, S, selEl } from './state.js';

function resolveVar(name: string): string {
  try {
    return getComputedStyle(cv).getPropertyValue(name).trim() || '#888888';
  } catch {
    return '#888888';
  }
}

function hexOf(v: string | undefined, fallbackVar?: string): string {
  if (v && /^#[0-9a-f]{3,8}$/i.test(v)) return v;
  return resolveVar(fallbackVar || '--sc-panel');
}

function row(label: string, ctl: string): string {
  return `<div class="ir"><label>${esc(label)}</label>${ctl}</div>`;
}
function num(k: string, v: unknown, mn?: number, mx?: number, step?: number): string {
  return `<input type="number" data-k="${k}" value="${v == null ? 0 : String(v)}"${mn != null ? ` min="${mn}"` : ''}${mx != null ? ` max="${mx}"` : ''} step="${step || 1}">`;
}
function rng(k: string, v: unknown, mn: number, mx: number, step?: number, unit?: string): string {
  return `<div><input type="range" data-k="${k}" value="${String(v)}" min="${mn}" max="${mx}" step="${step || 1}"><div class="val">${String(v)}${unit || ''}</div></div>`;
}

export function buildInspector(): void {
  const host = $<HTMLElement>('#inspBody');
  if (!host) return;
  $$<HTMLElement>('.st-ins-tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-itab') === S.itab)));

  if (S.itab === 'layers') {
    if (!S.els.length) {
      host.innerHTML = '<div class="st-none">No layers yet. Add something from the library.</div>';
      return;
    }
    host.innerHTML =
      '<div class="ig"><h5>Layers · top of the list is in front</h5><div class="layers">' +
      S.els.slice().reverse().map((e) =>
        `<div class="layer${e.hide ? ' off' : ''}" data-lid="${e.id}" aria-current="${e.id === S.sel}">` +
        `<span>${esc(e.name || e.type)}</span>` +
        `<button type="button" data-act="eye" data-lid="${e.id}" title="Show or hide" aria-label="Show or hide">${e.hide ? '◌' : '◉'}</button>` +
        `<button type="button" data-act="lock" data-lid="${e.id}" title="Lock" aria-label="Lock">${e.lock ? '🔒' : '🔓'}</button>` +
        '</div>',
      ).join('') +
      '</div></div>' +
      '<div class="ig"><h5>Order</h5><div class="ir2">' +
      '<button class="st-b" type="button" data-act="front">Bring to front</button>' +
      '<button class="st-b" type="button" data-act="back">Send to back</button>' +
      '<button class="st-b" type="button" data-act="up">Forward</button>' +
      '<button class="st-b" type="button" data-act="down">Backward</button></div></div>';
    return;
  }

  if (S.itab === 'page') {
    host.innerHTML =
      '<div class="ig"><h5>Canvas</h5>' +
      row('Size', '<select data-k="__dev">' + (Object.keys(DEV) as (keyof typeof DEV)[]).map((k) => `<option value="${k}"${k === S.dev ? ' selected' : ''}>${k} · ${DEV[k][0]}×${DEV[k][1]}</option>`).join('') + '</select>') +
      row('Theme', `<select data-k="__cvtheme"><option value="light"${S.cv === 'light' ? ' selected' : ''}>Light</option><option value="dark"${S.cv === 'dark' ? ' selected' : ''}>Dark</option></select>`) +
      row('Zoom', rng('__zoom', Math.round(S.zoom * 100), 25, 200, 5, '%')) +
      `<div class="ir2" style="margin-top:4px"><label class="ir-chk"><input type="checkbox" data-k="__grid"${S.grid ? ' checked' : ''}>Show grid</label>` +
      `<label class="ir-chk"><input type="checkbox" data-k="__snap"${S.snap ? ' checked' : ''}>Snap to grid</label></div></div>` +
      `<div class="ig"><h5>This design</h5><div class="st-none">${S.els.length} elements. Saved in this browser as you work — nothing is sent anywhere until you press send.</div>` +
      '<div class="ir2"><button class="st-b" type="button" data-act="quote">Send for a quote</button><button class="st-b" type="button" data-act="clear">Clear canvas</button></div></div>';
    return;
  }

  const e = selEl();
  if (!e) {
    host.innerHTML = '<div class="st-none"><b style="color:var(--st-txt)">Nothing selected</b><br><br>Tap an element on the canvas to change its words, colour, corners, shadow and position.<br><br>Tip: start with a preset, then edit it.</div>';
    return;
  }
  const d = T[e.type];
  let out = '';
  out += `<div class="ig"><h5>${esc(d?.label || e.type)}</h5>` + row('Name', `<input type="text" data-k="name" value="${esc(e.name || '')}">`);
  (d?.fields || []).forEach((f) => {
    const k = 'p.' + f[0];
    const v = e.p[f[0]];
    const ty = f[2] || 'text';
    if (ty === 'area') out += row(f[1], `<textarea data-k="${k}">${esc(v)}</textarea>`);
    else if (ty === 'num') out += row(f[1], num(k, v));
    else if (ty === 'chk') out += `<label class="ir-chk" style="padding:2px 0 4px"><input type="checkbox" data-k="${k}"${+(v as number) ? ' checked' : ''}>${esc(f[1])}</label>`;
    else if (ty.indexOf('sel:') === 0)
      out += row(f[1], `<select data-k="${k}">${ty.slice(4).split(',').map((o) => `<option value="${esc(o)}"${String(v) === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`);
    else out += row(f[1], `<input type="text" data-k="${k}" value="${esc(v)}">`);
  });
  out += '</div>';

  out += '<div class="ig"><h5>Position and size</h5>' +
    '<div class="ir2">' + row('X', num('x', e.x)) + row('Y', num('y', e.y)) + '</div>' +
    '<div class="ir2">' + row('Width', num('w', e.w, 4)) + row('Height', num('h', e.h, 4)) + '</div>' +
    row('Rotate', rng('rot', e.rot, -180, 180, 1, '°')) +
    row('Opacity', rng('op', Math.round(e.op * 100), 10, 100, 1, '%')) + '</div>';

  out += '<div class="ig"><h5>Layer style</h5>' +
    row('Fill', `<input type="color" data-k="s.fill" value="${hexOf(e.s.fill, d?.fillVar)}">`) +
    `<label class="ir-chk"><input type="checkbox" data-k="s.grad"${+e.s.grad ? ' checked' : ''}>Gradient</label>` +
    (+e.s.grad ? row('Second', `<input type="color" data-k="s.fill2" value="${hexOf(e.s.fill2, '--sc-brand')}">`) + row('Angle', rng('s.gdir', e.s.gdir, 0, 360, 5, '°')) : '') +
    row('Corners', rng('s.radius', e.s.radius, 0, 60, 1, 'px')) +
    row('Border', rng('s.bw', e.s.bw, 0, 10, 1, 'px')) +
    (+e.s.bw > 0 ? row('Colour', `<input type="color" data-k="s.bc" value="${hexOf(e.s.bc, '--sc-line')}">`) : '') +
    row('Padding', rng('s.pad', e.s.pad, 0, 48, 1, 'px')) +
    row('Shadow', '<select data-k="s.shadow">' + (['none', 'sm', 'md', 'lg', 'inner'] as const).map((o) => `<option value="${o}"${e.s.shadow === o ? ' selected' : ''}>${o}</option>`).join('') + '</select>') +
    '<button class="st-b" type="button" data-act="resetstyle" style="margin-top:4px">Reset to theme colours</button></div>';

  out += '<div class="ig"><h5>Adjustments</h5>' +
    row('Bright', rng('a.br', e.a.br, 20, 180, 1, '%')) +
    row('Contrast', rng('a.ct', e.a.ct, 20, 200, 1, '%')) +
    row('Saturate', rng('a.sa', e.a.sa, 0, 250, 1, '%')) +
    row('Blur', rng('a.bl', e.a.bl, 0, 14, 0.5, 'px')) +
    row('Hue', rng('a.hu', e.a.hu, -180, 180, 1, '°')) +
    '<button class="st-b" type="button" data-act="resetadj" style="margin-top:4px">Reset adjustments</button></div>';

  out += '<div class="ig"><h5>This element</h5><div class="ir2">' +
    '<button class="st-b" type="button" data-act="dup">Duplicate</button>' +
    '<button class="st-b" type="button" data-act="del">Delete</button>' +
    `<button class="st-b" type="button" data-act="lockthis">${e.lock ? 'Unlock' : 'Lock'}</button>` +
    '<button class="st-b" type="button" data-act="centerh">Centre across</button></div></div>';
  host.innerHTML = out;
}

function setByPath(e: ElementInstance, k: string, v: unknown): void {
  const a = k.split('.');
  const [first, second] = a;
  if (!first) return;
  if (a.length === 1) (e as unknown as Record<string, unknown>)[first] = v;
  else if (second) (e as unknown as Record<string, Record<string, unknown>>)[first]![second] = v;
}

const pendingDebounce = new WeakSet<EventTarget>();

export function onInspectorInput(ev: Event): void {
  const t = ev.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const k = t.getAttribute('data-k');
  if (!k) return;
  if (k.indexOf('__') === 0) {
    if (k === '__dev') { S.dev = t.value as typeof S.dev; syncDevBtns(); renderCanvas(); zoomFit(); saveLocal(); }
    if (k === '__cvtheme') { S.cv = t.value as typeof S.cv; syncCvTheme(); renderCanvas(); saveLocal(); }
    if (k === '__zoom') { S.zoom = clamp(+t.value / 100, 0.25, 2); renderCanvas(); }
    if (k === '__grid') { S.grid = (t as HTMLInputElement).checked ? 1 : 0; syncToggles(); renderCanvas(); }
    if (k === '__snap') { S.snap = (t as HTMLInputElement).checked ? 1 : 0; syncToggles(); }
    return;
  }
  const e = selEl();
  if (!e) return;
  let v: unknown;
  if (t.type === 'checkbox') v = (t as HTMLInputElement).checked ? 1 : 0;
  else if (t.type === 'number' || t.type === 'range') v = parseFloat(t.value) || 0;
  else v = t.value;
  if (k === 'op') v = clamp(v as number, 10, 100) / 100;
  if (k === 'x' || k === 'y' || k === 'w' || k === 'h') v = Math.round(v as number);
  if (k === 'w' || k === 'h') v = Math.max(4, v as number);
  if (!pendingDebounce.has(t)) {
    pushUndo();
    pendingDebounce.add(t);
    setTimeout(() => pendingDebounce.delete(t), 700);
  }
  setByPath(e, k, v);
  const sib = t.parentElement?.querySelector<HTMLElement>('.val');
  if (sib && t.type === 'range') sib.textContent = t.value + (sib.textContent?.replace(/[-\d.]/g, '') || '');
  const structural = k === 's.grad' || k === 's.bw' || k === 'name';
  if (structural) {
    refreshEl(e.id);
    buildInspector();
  } else refreshEl(e.id);
  saveLocal();
}
