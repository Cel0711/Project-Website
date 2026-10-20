import { $, $$, clamp, toast, uid } from '../../core/dom.js';
import { goQuote } from '../request-quote/form.js';
import { saveDesignFile } from '../request-quote/fallback.js';
import { buildInspector, onInspectorInput } from './inspector.js';
import { buildPalCats, buildPalette } from './palette-ui.js';
import { saveLocal } from './persistence.js';
import { doRedo, doUndo, drawSel, refreshEl, renderCanvas, syncCvTheme, syncDevBtns, syncToggles, zoomFit } from './canvas.js';
import { DEV, findEl, pushUndo, S, selEl, type StudioMutableState } from './state.js';
import { closeDrawers, isNarrow } from './ui-utils.js';

export function layerAct(act: string): void {
  const e = selEl();
  if (act === 'clear') {
    if (!S.els.length) return;
    pushUndo();
    S.els = [];
    S.sel = null;
    renderCanvas();
    saveLocal();
    toast('Canvas cleared. Undo is one press away.');
    return;
  }
  if (act === 'quote') {
    goQuote();
    return;
  }
  if (!e) {
    toast('Select an element first');
    return;
  }
  const i = S.els.indexOf(e);
  if (act === 'front') { pushUndo(); S.els.splice(i, 1); S.els.push(e); }
  else if (act === 'back') { pushUndo(); S.els.splice(i, 1); S.els.unshift(e); }
  else if (act === 'up' && i < S.els.length - 1) { pushUndo(); const next = S.els[i + 1]; if (next) { S.els[i] = next; S.els[i + 1] = e; } }
  else if (act === 'down' && i > 0) { pushUndo(); const prev = S.els[i - 1]; if (prev) { S.els[i] = prev; S.els[i - 1] = e; } }
  else if (act === 'dup') {
    pushUndo();
    const c = JSON.parse(JSON.stringify(e));
    c.id = uid();
    c.x += 16;
    c.y += 16;
    c.name = e.name + ' copy';
    S.els.push(c);
    S.sel = c.id;
  } else if (act === 'del') { pushUndo(); S.els.splice(i, 1); S.sel = null; }
  else if (act === 'lockthis') { pushUndo(); e.lock = e.lock ? 0 : 1; }
  else if (act === 'centerh') { pushUndo(); e.x = Math.round((DEV[S.dev][0] - e.w) / 2); }
  else if (act === 'resetstyle') { pushUndo(); e.s.fill = ''; e.s.fill2 = ''; e.s.grad = 0; e.s.bc = ''; }
  else if (act === 'resetadj') { pushUndo(); e.a = { br: 100, ct: 100, sa: 100, bl: 0, hu: 0 }; }
  renderCanvas();
  saveLocal();
}

export function initToolbar(): void {
  $('#palBtn')?.addEventListener('click', () => { $('#insp')?.classList.remove('open'); $('#pal')?.classList.toggle('open'); });
  $('#inspBtn')?.addEventListener('click', () => { $('#pal')?.classList.remove('open'); $('#insp')?.classList.toggle('open'); });
  $$<HTMLElement>('[data-close]').forEach((b) => b.addEventListener('click', closeDrawers));
  $$<HTMLElement>('[data-dev]').forEach((b) => {
    b.addEventListener('click', () => {
      S.dev = (b.getAttribute('data-dev') as StudioMutableState['dev']) || 'desktop';
      syncDevBtns();
      renderCanvas();
      zoomFit();
      saveLocal();
    });
  });
  $('#zIn')?.addEventListener('click', () => { S.zoom = clamp(S.zoom + 0.1, 0.25, 2); renderCanvas(); });
  $('#zOut')?.addEventListener('click', () => { S.zoom = clamp(S.zoom - 0.1, 0.25, 2); renderCanvas(); });
  $('#zFit')?.addEventListener('click', zoomFit);
  $('#gridBtn')?.addEventListener('click', () => { S.grid = S.grid ? 0 : 1; syncToggles(); renderCanvas(); });
  $('#snapBtn')?.addEventListener('click', () => { S.snap = S.snap ? 0 : 1; syncToggles(); });
  $('#cvThemeBtn')?.addEventListener('click', () => { S.cv = S.cv === 'dark' ? 'light' : 'dark'; syncCvTheme(); renderCanvas(); saveLocal(); });
  $('#undoBtn')?.addEventListener('click', doUndo);
  $('#redoBtn')?.addEventListener('click', doRedo);
  $('#dupBtn')?.addEventListener('click', () => layerAct('dup'));
  $('#delBtn')?.addEventListener('click', () => layerAct('del'));
  $('#clearBtn')?.addEventListener('click', () => layerAct('clear'));
  $('#startBtn')?.addEventListener('click', () => {
    buildPalCats();
    buildPalette();
    const items = $<HTMLElement>('#stItems');
    if (items) items.scrollTop = 0;
    if (isNarrow()) $('#pal')?.classList.add('open');
    toast('Pick a whole screen, or one of our builds, to start from');
  });
  $('#saveFileBtn')?.addEventListener('click', () => saveDesignFile());
  $('#quoteThisBtn')?.addEventListener('click', goQuote);

  $$<HTMLElement>('.st-ins-tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      S.itab = (b.getAttribute('data-itab') as StudioMutableState['itab']) || 'style';
      buildInspector();
    });
  });
  const ib = $<HTMLElement>('#inspBody');
  if (ib) {
    ib.addEventListener('input', onInspectorInput);
    ib.addEventListener('change', onInspectorInput);
    ib.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      const a = target.closest<HTMLElement>('[data-act]');
      if (a && !a.hasAttribute('data-lid')) {
        layerAct(a.getAttribute('data-act') ?? '');
        return;
      }
      if (a) return;
      const l = target.closest<HTMLElement>('.layer');
      if (l) {
        S.sel = l.getAttribute('data-lid');
        drawSel();
        buildInspector();
      }
    });
    ib.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act][data-lid]');
      if (!b) return;
      const e = findEl(b.getAttribute('data-lid'));
      if (!e) return;
      pushUndo();
      if (b.getAttribute('data-act') === 'eye') e.hide = e.hide ? 0 : 1;
      if (b.getAttribute('data-act') === 'lock') e.lock = e.lock ? 0 : 1;
      renderCanvas();
      saveLocal();
    });
  }

  document.addEventListener('keydown', (ev) => {
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const mod = ev.metaKey || ev.ctrlKey;
    if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); return; }
    if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); layerAct('dup'); return; }
    if (!S.sel) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); layerAct('del'); return; }
    const step = ev.shiftKey ? 8 : 1;
    const e = selEl();
    if (!e || e.lock) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); pushUndo(); e.x -= step; }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); pushUndo(); e.x += step; }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); pushUndo(); e.y -= step; }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); pushUndo(); e.y += step; }
    else return;
    refreshEl(e.id);
    buildInspector();
    saveLocal();
  });
}
