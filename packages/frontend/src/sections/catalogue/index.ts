// Section: Catalogue (#work) — the filterable grid of builds plus the project detail modal.
// Markup: catalogue.html, project-modal.html · Styles: catalogue.css · Data: projects.ts, scenes.ts
import type { ProjectCategory, Scene } from '@coreloop/shared';
import { $, $$, esc } from '../../core/dom.js';
import { PROJECTS } from './projects.js';
import { SCENES } from './scenes.js';
import { paintScene } from '../../engine/stage.js';
import './catalogue.css';

const sceneCache: Record<string, Scene> = {};
/** Shared with the hero laptop (page/hero.ts), which paints one of these scenes. */
export function getScene(k: string): Scene {
  if (!sceneCache[k]) {
    const factory = SCENES[k];
    if (!factory) throw new Error(`Unknown scene: ${k}`);
    sceneCache[k] = factory();
  }
  return sceneCache[k];
}
function projById(id: string) {
  return PROJECTS.find((p) => p.id === id) ?? null;
}

const CATS: ('All' | ProjectCategory)[] = ['All', 'AI & automation', 'Dashboards & analytics', 'Enterprise systems', 'Apps & web'];
let curCat: 'All' | ProjectCategory = 'All';

export function buildFilters(): void {
  const h = $<HTMLElement>('#filters');
  if (!h) return;
  h.innerHTML = CATS.map((c) => {
    const n = c === 'All' ? PROJECTS.length : PROJECTS.filter((p) => p.cat === c).length;
    return `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${c === curCat}">${esc(c)} <span class="mono" style="opacity:.6">${n}</span></button>`;
  }).join('');
  h.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('.chip');
    if (!b) return;
    curCat = (b.getAttribute('data-cat') as 'All' | ProjectCategory) ?? 'All';
    $$<HTMLElement>('.chip', h).forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    buildWork();
  });
}

export function buildWork(): void {
  const h = $<HTMLElement>('#workGrid');
  if (!h) return;
  const list = PROJECTS.filter((p) => curCat === 'All' || p.cat === curCat);
  h.innerHTML = list.map((p) =>
    `<button class="plate" type="button" data-id="${p.id}">` +
    `<span class="plate-shot" data-sc="${p.scene}"><span class="plate-id">${p.id}</span><span class="plate-zoom">Open build</span></span>` +
    `<span class="plate-body"><span class="plate-cat">${esc(p.cat)}</span><span class="plate-t">${esc(p.t)}</span><span class="plate-d">${esc(p.blurb)}</span></span></button>`,
  ).join('');
  $$<HTMLElement>('.plate-shot', h).forEach((sh) => {
    paintScene(sh, getScene(sh.getAttribute('data-sc') ?? ''));
    sh.style.height = '';
  });
}

export function openProject(id: string): void {
  const p = projById(id);
  if (!p) return;
  const idEl = $<HTMLElement>('#mId');
  if (idEl) idEl.textContent = `${p.id} · ${p.cat}`;
  const titleEl = $<HTMLElement>('#mTitle');
  if (titleEl) titleEl.textContent = p.t;
  const blurbEl = $<HTMLElement>('#mBlurb');
  if (blurbEl) blurbEl.textContent = p.blurb;
  const shot = $<HTMLElement>('#mShot');
  if (shot) paintScene(shot, getScene(p.scene), 0.5);
  const readEl = $<HTMLElement>('#mRead');
  if (readEl) readEl.innerHTML = p.read.map((r) => `<li><span>${esc(r[0].slice(0, 2).toUpperCase())}</span><span><b>${esc(r[0])}.</b> ${esc(r[1])}</span></li>`).join('');
  const specsEl = $<HTMLElement>('#mSpecs');
  if (specsEl) specsEl.innerHTML = Object.keys(p.specs).map((k) => `<div class="spec"><span class="fld">${esc(k)}</span><p>${esc(p.specs[k])}</p></div>`).join('');
  const stackEl = $<HTMLElement>('#mStack');
  if (stackEl) stackEl.innerHTML = p.stack.map((s) => `<li>${esc(s)}</li>`).join('');
  const openBtn = $<HTMLElement>('#mOpen');
  openBtn?.setAttribute('data-scene', p.scene);
  openBtn?.setAttribute('data-title', p.t);
  const m = $<HTMLElement>('#modal');
  m?.classList.add('open');
  document.body.style.overflow = 'hidden';
  const card = m?.querySelector<HTMLElement>('.modal-card');
  if (card) card.scrollTop = 0;
}

export function closeModal(): void {
  $('#modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

/** Wires up the section: filter chips, build grid, and the project detail modal. */
export function initCatalogue(): void {
  buildFilters();
  buildWork();

  $('#workGrid')?.addEventListener('click', (ev) => {
    const pl = (ev.target as HTMLElement).closest<HTMLElement>('.plate');
    if (pl) openProject(pl.getAttribute('data-id') ?? '');
  });
  $$<HTMLElement>('[data-close-modal]').forEach((x) => x.addEventListener('click', closeModal));
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && $('#modal')?.classList.contains('open')) closeModal();
  });
}
