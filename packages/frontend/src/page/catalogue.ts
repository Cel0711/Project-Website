import type { ProjectCategory, Scene } from '@coreloop/shared';
import { $, $$, esc } from '../core/dom.js';
import { CAPS } from '../content/caps.js';
import { PROJECTS } from '../content/projects.js';
import { SCENES } from '../content/scenes.js';
import { paintScene } from '../engine/stage.js';

export function buildCaps(): void {
  const h = $<HTMLElement>('#caps');
  if (!h) return;
  h.innerHTML = CAPS.map((c) =>
    `<article class="cap"><span class="cap-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${c.ic}"/></svg></span>` +
    `<h3>${esc(c.t)}</h3><p>${esc(c.d)}</p><ul>${c.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></article>`,
  ).join('');
}

const sceneCache: Record<string, Scene> = {};
function getScene(k: string): Scene {
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

export function buildFooterLinks(): void {
  const h = $<HTMLElement>('#fWork');
  if (!h) return;
  h.innerHTML = PROJECTS.slice(0, 6).map((p) => `<li><a href="#work" data-open="${p.id}">${esc(p.t)}</a></li>`).join('');
  h.addEventListener('click', (ev) => {
    const a = (ev.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (!a) return;
    ev.preventDefault();
    openProject(a.getAttribute('data-open') ?? '');
  });
}

export function buildHero(): void {
  const h = $<HTMLElement>('#heroShot');
  if (!h) return;
  paintScene(h, getScene('execOps'));
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const lidDelay = 1.3; // screen boots up once the laptop lid has finished opening
  const els = $$<HTMLElement>('.el', h);
  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = (el.style.transform || '') + ' translateY(9px)';
    el.style.transition = `opacity .5s ease ${lidDelay + 0.05 + i * 0.055}s, transform .5s cubic-bezier(.2,.9,.3,1) ${lidDelay + 0.05 + i * 0.055}s`;
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      els.forEach((el) => {
        el.style.opacity = '';
        el.style.transform = el.style.transform.replace(' translateY(9px)', '');
      });
    });
  });
}
