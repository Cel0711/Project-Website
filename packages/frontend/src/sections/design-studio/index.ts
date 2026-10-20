// Section: Design studio (#studio) — the drag-and-drop screen designer.
// Markup: design-studio.html · Styles: design-studio.css · Element library: palette-data.ts · Starter layouts: presets.ts
// Renders elements via the shared engine (src/engine, src/renderers), which this section does not own.
import { $ } from '../../core/dom.js';
import { PRESETS } from './presets.js';
import { initCanvas, renderCanvas, syncCvTheme, syncDevBtns, syncToggles, zoomFit } from './canvas.js';
import { initPalette } from './palette-ui.js';
import { loadLocal } from './persistence.js';
import { S, setCanvasRefs } from './state.js';
import { initToolbar } from './toolbar.js';
import { isNarrow } from './ui-utils.js';
import './design-studio.css';

export function initStudio(): void {
  const cv = $<HTMLElement>('#cv');
  const cvWrap = $<HTMLElement>('#cvWrap');
  const cvEmpty = $<HTMLElement>('#cvEmpty');
  if (!cv || !cvWrap || !cvEmpty) return;
  setCanvasRefs(cv, cvWrap, cvEmpty);

  if (!loadLocal()) {
    if (isNarrow()) {
      S.els = PRESETS['mobile']?.make() ?? [];
      S.dev = 'phone';
    } else {
      S.els = PRESETS['opsdash']?.make() ?? [];
    }
  }
  syncDevBtns();
  syncToggles();
  syncCvTheme();
  initPalette();
  initCanvas();
  initToolbar();
  renderCanvas();
  zoomFit();

  let zt: ReturnType<typeof setTimeout>;
  addEventListener('resize', () => {
    clearTimeout(zt);
    zt = setTimeout(() => {
      if (S.zoom <= 1) zoomFit();
    }, 200);
  });
}
