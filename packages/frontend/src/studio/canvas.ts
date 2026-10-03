import type { ElementInstance } from '@coreloop/shared';
import { $, $$, clamp, esc } from '../core/dom.js';
import { boxCss, innerHtml, renderEl } from '../engine/factory.js';
import { buildInspector } from './inspector.js';
import { saveLocal } from './persistence.js';
import { cv, cvEmpty, cvWrap, DEV, findEl, pushUndo, S, selEl, snap, updateUndoBtns } from './state.js';
import { updateAttachState } from './ui-utils.js';

export function cvPoint(ev: PointerEvent | DragEvent): [number, number] {
  const r = cv.getBoundingClientRect();
  return [(ev.clientX - r.left) / S.zoom, (ev.clientY - r.top) / S.zoom];
}

export function renderCanvas(): void {
  const d = DEV[S.dev];
  cv.style.width = d[0] + 'px';
  cv.style.height = d[1] + 'px';
  cv.setAttribute('data-cv', S.cv);
  cv.classList.toggle('grid', !!S.grid);
  cv.style.transform = `scale(${S.zoom})`;
  cv.innerHTML = S.els.map(renderEl).join('');
  if (!S.els.length) {
    cv.appendChild(cvEmpty);
  }
  drawSel();
  const st = $<HTMLElement>('#stStat');
  if (st) st.textContent = S.els.length + (S.els.length === 1 ? ' element' : ' elements') + ' · ' + d[0] + '×' + d[1];
  const z = $<HTMLElement>('#zLbl');
  if (z) z.textContent = Math.round(S.zoom * 100) + '%';
  updateAttachState();
  buildInspector();
}

export function refreshEl(id: string | null): void {
  const e = findEl(id);
  if (!e) return;
  const n = cv.querySelector<HTMLElement>(`.el[data-id="${e.id}"]`);
  if (!n) {
    renderCanvas();
    return;
  }
  n.setAttribute('style', boxCss(e));
  n.className = 'el' + (e.lock ? ' lock' : '');
  n.innerHTML = innerHtml(e);
  drawSel();
}

export function drawSel(): void {
  $$('.sel-box,.hnd,.guide', cv).forEach((n) => n.remove());
  const e = selEl();
  if (!e || e.hide) return;
  const b = document.createElement('div');
  b.className = 'sel-box';
  b.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;${+e.rot ? `transform:rotate(${e.rot}deg);` : ''}`;
  b.innerHTML = `<b>${esc(e.name || e.type)}${e.lock ? ' · locked' : ''}</b>`;
  cv.appendChild(b);
  if (e.lock) return;
  const pts: [string, number, number][] = [['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0], ['e', 1, 0.5], ['se', 1, 1], ['s', 0.5, 1], ['sw', 0, 1], ['w', 0, 0.5]];
  pts.forEach((p) => {
    const h = document.createElement('div');
    h.className = 'hnd';
    h.setAttribute('data-h', p[0]);
    h.style.cssText = `left:${e.x + e.w * p[1] - 5}px;top:${e.y + e.h * p[2] - 5}px;cursor:${p[0]}-resize`;
    cv.appendChild(h);
  });
  const r = document.createElement('div');
  r.className = 'hnd rot';
  r.setAttribute('data-h', 'rot');
  r.style.cssText = `left:${e.x + e.w / 2 - 5}px;top:${e.y - 26}px`;
  cv.appendChild(r);
}

export function doUndo(): void {
  if (!S.undo.length) return;
  S.redo.push(JSON.stringify(S.els));
  S.els = JSON.parse(S.undo.pop() as string);
  if (!findEl(S.sel)) S.sel = null;
  renderCanvas();
  saveLocal();
  updateUndoBtns();
}

export function doRedo(): void {
  if (!S.redo.length) return;
  S.undo.push(JSON.stringify(S.els));
  S.els = JSON.parse(S.redo.pop() as string);
  if (!findEl(S.sel)) S.sel = null;
  renderCanvas();
  saveLocal();
  updateUndoBtns();
}

export function zoomFit(): void {
  const avail = cvWrap.clientWidth - 52;
  const d = DEV[S.dev];
  S.zoom = clamp(avail / d[0], 0.25, 1);
  renderCanvas();
}

export function syncDevBtns(): void {
  $$<HTMLElement>('[data-dev]').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-dev') === S.dev)));
}

export function syncToggles(): void {
  $('#gridBtn')?.setAttribute('aria-pressed', String(!!S.grid));
  $('#snapBtn')?.setAttribute('aria-pressed', String(!!S.snap));
}

export function syncCvTheme(): void {
  const b = $<HTMLElement>('#cvThemeBtn');
  if (b) b.textContent = S.cv === 'dark' ? 'Light canvas' : 'Dark canvas';
}

/* ---------- pointer interaction: move / resize / rotate / snap guides ---------- */
export function initCanvas(): void {
  type Mode = 'move' | 'size' | 'rot' | null;
  let mode: Mode = null;
  let hnd: string | null = null;
  let sx = 0, sy = 0;
  let st: { x: number; y: number; w: number; h: number; rot: number } | null = null;
  let moved = false;

  cv.addEventListener('pointerdown', (ev) => {
    const target = ev.target as HTMLElement;
    const h = target.closest<HTMLElement>('.hnd');
    const node = target.closest<HTMLElement>('.el');
    if (h) {
      const e = selEl();
      if (!e || e.lock) return;
      mode = h.getAttribute('data-h') === 'rot' ? 'rot' : 'size';
      hnd = h.getAttribute('data-h');
    } else if (node) {
      const id = node.getAttribute('data-id');
      if (id !== S.sel) {
        S.sel = id;
        S.itab = 'style';
        drawSel();
        buildInspector();
      }
      const el = findEl(id);
      if (!el || el.lock) return;
      mode = 'move';
    } else {
      if (S.sel) {
        S.sel = null;
        drawSel();
        buildInspector();
      }
      return;
    }
    const e2 = selEl();
    if (!e2) return;
    st = { x: e2.x, y: e2.y, w: e2.w, h: e2.h, rot: e2.rot };
    sx = ev.clientX;
    sy = ev.clientY;
    moved = false;
    cv.setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  });

  cv.addEventListener('pointermove', (ev) => {
    if (!mode || !st) return;
    const e = selEl();
    if (!e) return;
    const dx = (ev.clientX - sx) / S.zoom;
    const dy = (ev.clientY - sy) / S.zoom;
    if (!moved && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
      moved = true;
      pushUndo();
    }
    if (!moved) return;
    const d = DEV[S.dev];
    if (mode === 'move') {
      let nx = st.x + dx, ny = st.y + dy;
      if (ev.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) ny = st.y;
        else nx = st.x;
      }
      const g = guideSnap(e, nx, ny);
      e.x = clamp(snap(g[0]), -e.w + 20, d[0] + e.w - 20);
      e.y = clamp(snap(g[1]), -e.h + 20, d[1] + e.h - 20);
      showGuides(g[2]);
    } else if (mode === 'size') {
      let nx2 = st.x, ny2 = st.y, nw = st.w, nh = st.h;
      if ((hnd ?? '').indexOf('e') >= 0) nw = st.w + dx;
      if ((hnd ?? '').indexOf('s') >= 0) nh = st.h + dy;
      if ((hnd ?? '').indexOf('w') >= 0) { nw = st.w - dx; nx2 = st.x + dx; }
      if ((hnd ?? '').indexOf('n') >= 0) { nh = st.h - dy; ny2 = st.y + dy; }
      if (ev.shiftKey && st.w > 0) { const k = nw / st.w; nh = Math.round(st.h * k); }
      e.w = Math.max(16, snap(nw));
      e.h = Math.max(16, snap(nh));
      e.x = snap(nx2);
      e.y = snap(ny2);
    } else if (mode === 'rot') {
      const r = cv.getBoundingClientRect();
      const ccx = r.left + (e.x + e.w / 2) * S.zoom;
      const ccy = r.top + (e.y + e.h / 2) * S.zoom;
      let ang = (Math.atan2(ev.clientY - ccy, ev.clientX - ccx) * 180) / Math.PI + 90;
      if (ev.shiftKey) ang = Math.round(ang / 15) * 15;
      e.rot = Math.round(clamp(ang, -180, 180));
    }
    const n = cv.querySelector<HTMLElement>(`.el[data-id="${e.id}"]`);
    if (n) n.setAttribute('style', boxCss(e));
    drawSelLight(e);
  });

  function endDrag(): void {
    if (!mode) return;
    const wasMoved = moved;
    mode = null;
    hnd = null;
    moved = false;
    $$('.guide', cv).forEach((g) => g.remove());
    if (wasMoved) {
      refreshEl(S.sel);
      buildInspector();
      saveLocal();
    }
    drawSel();
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  function drawSelLight(e: ElementInstance): void {
    const b = cv.querySelector<HTMLElement>('.sel-box');
    if (b) b.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;${+e.rot ? `transform:rotate(${e.rot}deg);` : ''}`;
    const pts: Record<string, [number, number]> = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };
    $$<HTMLElement>('.hnd', cv).forEach((h) => {
      const k = h.getAttribute('data-h') ?? '';
      if (k === 'rot') {
        h.style.left = e.x + e.w / 2 - 5 + 'px';
        h.style.top = e.y - 26 + 'px';
        return;
      }
      const p = pts[k];
      if (!p) return;
      h.style.left = e.x + e.w * p[0] - 5 + 'px';
      h.style.top = e.y + e.h * p[1] - 5 + 'px';
    });
  }

  function guideSnap(e: ElementInstance, nx: number, ny: number): [number, number, [string, number][]] {
    if (!S.snap) return [nx, ny, []];
    const d = DEV[S.dev];
    const tol = 6;
    const gs: [string, number][] = [];
    const xs: [number, string][] = [[0, 'l'], [d[0] / 2, 'c'], [d[0], 'r']];
    const ys: [number, string][] = [[0, 't'], [d[1] / 2, 'm'], [d[1], 'b']];
    S.els.forEach((o) => {
      if (o.id === e.id || o.hide) return;
      xs.push([o.x, 'l'], [o.x + o.w / 2, 'c'], [o.x + o.w, 'r']);
      ys.push([o.y, 't'], [o.y + o.h / 2, 'm'], [o.y + o.h, 'b']);
    });
    const cand: [number, number][] = [[nx, 0], [nx + e.w / 2, e.w / 2], [nx + e.w, e.w]];
    outerX: for (let i = 0; i < cand.length; i++) {
      for (let j = 0; j < xs.length; j++) {
        const xsj = xs[j];
        if (xsj && Math.abs((cand[i]?.[0] ?? 0) - xsj[0]) < tol) {
          nx = xsj[0] - (cand[i]?.[1] ?? 0);
          gs.push(['v', xsj[0]]);
          break outerX;
        }
      }
    }
    const candy: [number, number][] = [[ny, 0], [ny + e.h / 2, e.h / 2], [ny + e.h, e.h]];
    outerY: for (let a = 0; a < candy.length; a++) {
      for (let b2 = 0; b2 < ys.length; b2++) {
        const ysb = ys[b2];
        if (ysb && Math.abs((candy[a]?.[0] ?? 0) - ysb[0]) < tol) {
          ny = ysb[0] - (candy[a]?.[1] ?? 0);
          gs.push(['h', ysb[0]]);
          break outerY;
        }
      }
    }
    return [nx, ny, gs];
  }

  function showGuides(gs: [string, number][]): void {
    $$('.guide', cv).forEach((g) => g.remove());
    const d = DEV[S.dev];
    gs.slice(0, 2).forEach((g) => {
      const n = document.createElement('div');
      n.className = 'guide';
      if (g[0] === 'v') n.style.cssText = `left:${g[1]}px;top:0;width:1px;height:${d[1]}px`;
      else n.style.cssText = `left:0;top:${g[1]}px;height:1px;width:${d[0]}px`;
      cv.appendChild(n);
    });
  }
}
