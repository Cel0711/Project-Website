import type { DesignPayload, Plan, QuoteFormInput } from '@coreloop/shared';
import { $, $$, esc, toast } from '../../core/dom.js';
import { CFG } from '../../config.js';
import { navigate } from '../../page/router.js';
import { T } from '../../renderers/registry.js';
import { DEV, S } from '../design-studio/state.js';
import { closeDrawers, updateAttachState } from '../design-studio/ui-utils.js';

export const KINDS = ['Custom software', 'Website', 'Android app', 'Automation', 'AI / knowledge', 'Dashboard', 'Point of sale', 'Integration', 'Not sure yet'];

const picked: Record<string, 1> = {};
let pickedPlan: string | null = null;

export function buildKinds(): void {
  const h = $<HTMLElement>('#qKind');
  if (!h) return;
  for (const k of Object.keys(picked)) delete picked[k]; // a fresh form (the portal re-creates it) starts with nothing picked
  h.innerHTML = KINDS.map((k) => `<button class="pick" type="button" data-k="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('');
  h.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('.pick');
    if (!b) return;
    const k = b.getAttribute('data-k') ?? '';
    const on = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(!on));
    if (on) delete picked[k];
    else picked[k] = 1;
  });
}

export function buildPlans(): void {
  const h = $<HTMLElement>('#qPlans');
  if (!h) return;
  const plans = CFG.plans || [];
  if (!plans.length) {
    (h.parentNode as HTMLElement).style.display = 'none';
    return;
  }
  pickedPlan = plans[0]?.id ?? null;
  h.innerHTML = plans.map((p) =>
    `<button class="plan" type="button" data-plan="${esc(p.id)}" data-rec="${p.rec ? 1 : 0}" aria-pressed="${p.id === pickedPlan}">` +
    (p.rec ? '<span class="rec">Most picked</span>' : '') +
    '<span class="tick"><svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5.2l2.2 2.2L8.5 2.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></span>' +
    `<b>${esc(p.name)}</b>` +
    `<span class="pp">${esc(p.price)}</span>` +
    `<span class="pn">${esc(p.per)}</span>` +
    '<ul>' + (p.items || []).map((i) => `<li><svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.2 5.2l2.2 2.2L8.8 2" stroke="var(--brand)" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg><span>${esc(i)}</span></li>`).join('') + '</ul></button>',
  ).join('');
  h.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('.plan');
    if (!b) return;
    pickedPlan = b.getAttribute('data-plan');
    $$<HTMLElement>('.plan', h).forEach((p) => p.setAttribute('aria-pressed', String(p === b)));
    planNote();
  });
  planNote();
}

export function curPlan(): Plan | null {
  const ps = CFG.plans || [];
  for (const p of ps) if (p.id === pickedPlan) return p;
  return ps[0] ?? null;
}

export function planNote(): void {
  const n = $<HTMLElement>('#planNote');
  const p = curPlan();
  if (!n || !p) return;
  n.textContent = p.price === 'Free'
    ? 'No commitment. We read your design and reply with a range.'
    : `${p.name}: ${p.price} · ${p.per}. Nothing is charged from this form — we confirm scope and price first.`;
}

export function goQuote(): void {
  const a = $<HTMLInputElement>('#qAttach');
  if (a && S.els.length) a.checked = true;
  updateAttachState();
  closeDrawers();
  navigate('contact'); // the quote form is its own page now
  setTimeout(() => {
    const n = $<HTMLInputElement>('#qName');
    if (n && !n.value) n.focus({ preventScroll: true });
  }, 700);
  if (S.els.length) toast('Your design will be attached to the request');
}

export function designPayload(): DesignPayload {
  return {
    device: S.dev,
    canvas: DEV[S.dev],
    theme: S.cv,
    count: S.els.length,
    elements: S.els.map((e) => ({ type: e.type, name: e.name, x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot, opacity: e.op, style: e.s, adjust: e.a, content: e.p })),
  };
}

export function designSummary(max = 30): string {
  if (!S.els.length) return 'No design attached.';
  const l = [`Canvas: ${S.dev} ${DEV[S.dev][0]}x${DEV[S.dev][1]}, ${S.cv} theme, ${S.els.length} elements.`];
  S.els.slice(0, max).forEach((e, i) => {
    let lab = String((e.p['title'] ?? e.p['label'] ?? e.p['text'] ?? e.p['char'] ?? '') || '');
    if (lab) lab = ` "${lab.replace(/\s+/g, ' ').slice(0, 42)}"`;
    l.push(`${i + 1}. ${T[e.type]?.label || e.type}${lab} — ${e.w}x${e.h} at ${e.x},${e.y}`);
  });
  if (S.els.length > max) l.push(`...and ${S.els.length - max} more (full detail is in the attached file).`);
  return l.join('\n');
}

export function readForm(): QuoteFormInput {
  const g = (id: string): string => {
    const n = $<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
    return n ? n.value.trim() : '';
  };
  const plan = curPlan();
  return {
    name: g('#qName'), company: g('#qCompany'), email: g('#qEmail'), phone: g('#qPhone'),
    kinds: Object.keys(picked), planId: plan?.id ?? null, planName: plan?.name ?? null,
    budget: g('#qBudget'), timeline: g('#qWhen'), notes: g('#qNotes'),
    attach: !!$<HTMLInputElement>('#qAttach')?.checked && S.els.length > 0,
  };
}

export function briefText(f: QuoteFormInput): string {
  return [
    `QUOTE REQUEST — ${CFG.company}`,
    '',
    `Plan chosen: ${f.planId ? `${f.planName} (${curPlan()?.price}, ${curPlan()?.per})` : 'not selected'}`,
    `Name: ${f.name}`,
    `Company: ${f.company || '—'}`,
    `Email: ${f.email}`,
    `Phone: ${f.phone || '—'}`,
    `Work needed: ${f.kinds.length ? f.kinds.join(', ') : '—'}`,
    `Budget: ${f.budget}`,
    `Timeline: ${f.timeline}`,
    '',
    'WHAT HAPPENS TODAY, AND WHAT SHOULD HAPPEN INSTEAD',
    f.notes || '—',
    '',
    'DESIGN FROM THE STUDIO',
    f.attach ? designSummary(30) : 'No design attached.',
    '',
    `Sent from the design studio at ${location.href.split('#')[0]}`,
  ].join('\n');
}
