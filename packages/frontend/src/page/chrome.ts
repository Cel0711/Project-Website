import { $, $$, esc } from '../core/dom.js';
import { CFG } from '../config.js';
import { fitAllStages } from '../engine/stage.js';

export function applyBrand(): void {
  document.title = CFG.company + ' — custom software, automation and enterprise dashboards';
  $$<HTMLElement>('.brand span').forEach((s) => {
    const small = s.querySelector('small');
    s.textContent = CFG.company;
    if (small) s.appendChild(small);
  });
  const y = $<HTMLElement>('#yr');
  if (y) y.textContent = String(new Date().getFullYear());
  const ce = $<HTMLElement>('#cEmail');
  if (ce) ce.textContent = CFG.email;
  const fm = $<HTMLAnchorElement>('#fMail');
  if (fm) { fm.textContent = CFG.email; fm.href = 'mailto:' + CFG.email; }
  $$<HTMLElement>('.f-bot span').forEach((s) => {
    if (/All rights reserved/.test(s.textContent || '')) s.innerHTML = `&copy; <span id="yr">${new Date().getFullYear()}</span> ${esc(CFG.company)}. All rights reserved.`;
  });
}

export function initChrome(): void {
  const root = document.documentElement;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('cl_theme');
  } catch {
    /* storage may be blocked (private mode, locked-down browser) — theme just won't persist */
  }
  if (saved) root.setAttribute('data-theme', saved);
  $('#themeBtn')?.addEventListener('click', () => {
    let cur = root.getAttribute('data-theme');
    if (!cur) cur = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('cl_theme', next);
    } catch {
      /* same as above */
    }
    setTimeout(fitAllStages, 60);
  });

  const b = $<HTMLElement>('#burger');
  const m = $<HTMLElement>('#mobmenu');
  b?.addEventListener('click', () => {
    const open = m?.classList.toggle('open');
    b.setAttribute('aria-expanded', String(!!open));
  });
  m?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).tagName === 'A') {
      m.classList.remove('open');
      b?.setAttribute('aria-expanded', 'false');
    }
  });

  let rt: ReturnType<typeof setTimeout>;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(fitAllStages, 140);
  });
}
