// Section: Sign in / Create account (modal) — opened by #/login and #/signup, the nav "Sign in" button, or the quote form.
// Markup: auth-modal.html · Styles: auth-modal.css · Account chip in the nav: nav.ts
import { CURRENCIES, type AuthResponse, type PublicUser } from '@coreloop/shared';
import { ApiRequestError, api } from '../../api/client.js';
import { guessCurrency } from '../../auth/locale.js';
import { setSession } from '../../auth/session.js';
import { CFG } from '../../config.js';
import { $, $$, toast } from '../../core/dom.js';
import { currentRoute, onRoute, replaceRoute } from '../../page/router.js';
import './auth-modal.css';

type View = 'signin' | 'signup' | 'forgot' | 'remind';

const TITLES: Record<View, string> = {
  signin: 'Great to have you back!',
  signup: 'Create your account',
  forgot: 'Reset your password',
  remind: 'Remind me of my username',
};

const EYE_ON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A16.6 16.6 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

let modal: HTMLElement | null = null;
let view: View = 'signin';
let opener: HTMLElement | null = null;
/** Set while a caller (the quote form) is waiting to hear whether the visitor signed in. */
let waiter: ((user: PublicUser | null) => void) | null = null;
/** True when the visitor should stay on this page after signing in instead of being sent to the dashboard. */
let stay = false;

const isOpen = (): boolean => !!modal?.classList.contains('open');

function setView(next: View, message?: string): void {
  if (!modal) return;
  view = next;
  $$<HTMLElement>('.auth-view', modal).forEach((s) => (s.hidden = s.dataset['view'] !== next));
  const title = $('#authTitle', modal);
  if (title) title.textContent = TITLES[next];
  const social = $<HTMLElement>('[data-social]', modal);
  if (social) social.hidden = next === 'forgot' || next === 'remind';
  const ctx = $<HTMLElement>('[data-ctx]', modal);
  if (ctx) {
    ctx.textContent = message ?? '';
    ctx.hidden = !message;
  }
  $$<HTMLElement>('[data-done]', modal).forEach((d) => (d.hidden = true));
  $$<HTMLElement>('form', modal).forEach((f) => {
    f.hidden = false;
    clearErrors(f);
  });
  const first = $<HTMLElement>(`.auth-view[data-view="${next}"] input:not([type="hidden"])`, modal);
  setTimeout(() => first?.focus({ preventScroll: true }), 30);
}

function show(next: View, message?: string): void {
  if (!modal) return;
  if (!isOpen()) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  setView(next, message);
}

/** Opens the box. Resolves with the user once they are signed in, or with null if they close it first. */
export function openAuth(next: View = 'signin', opts: { message?: string; stay?: boolean } = {}): Promise<PublicUser | null> {
  stay = !!opts.stay;
  show(next, opts.message);
  return new Promise((resolve) => {
    waiter?.(null);
    waiter = resolve;
  });
}

function hide(result: PublicUser | null = null): void {
  if (!modal || !isOpen()) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  const r = currentRoute();
  if (r.overlay) replaceRoute(r.page, r.param); // #/login -> back to the page underneath
  opener?.focus?.({ preventScroll: true });
  opener = null;
  const w = waiter;
  waiter = null;
  w?.(result);
}

/* ---------- forms ---------- */

function clearErrors(form: HTMLElement): void {
  $$<HTMLElement>('[data-err]', form).forEach((e) => {
    e.hidden = true;
    e.textContent = '';
  });
  $$<HTMLElement>('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
}

function fail(form: HTMLElement, field: string, message: string): void {
  const slot = $<HTMLElement>(`[data-err="${field}"]`, form) ?? $<HTMLElement>('[data-err="_"]', form);
  if (slot) {
    slot.textContent = message;
    slot.hidden = false;
  }
  if (field !== '_') $<HTMLElement>(`[name="${field}"]`, form)?.setAttribute('aria-invalid', 'true');
}

/** Puts each server message next to its field; anything else goes in the box above the button. */
function showError(form: HTMLElement, err: unknown): void {
  if (!(err instanceof ApiRequestError)) {
    fail(form, '_', 'Something went wrong. Please try again.');
    return;
  }
  const fields = err.issues.map((i) => ({ field: i.split(':')[0] ?? '', text: i.slice(i.indexOf(':') + 1).trim() })).filter((x) => $(`[data-err="${x.field}"]`, form));
  if (fields.length) {
    fields.forEach((x) => fail(form, x.field, x.text));
    return;
  }
  fail(form, '_', err.message);
}

function values(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((v, k) => (out[k] = typeof v === 'string' ? v.trim() : ''));
  // passwords are sent exactly as typed
  $$<HTMLInputElement>('input[type="password"],input[type="text"][data-pw]', form).forEach((i) => (out[i.name] = i.value));
  return out;
}

function bind(form: HTMLFormElement | null, run: (data: Record<string, string>, form: HTMLFormElement) => Promise<void>): void {
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearErrors(form);
    const btn = $<HTMLButtonElement>('[type="submit"]', form);
    const label = btn?.textContent ?? '';
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = 'Please wait…';
    }
    try {
      await run(values(form), form);
    } catch (err) {
      showError(form, err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.textContent = label;
      }
    }
  });
}

/** Signed in: remember it for this page, then either carry on where the visitor was or open their dashboard. */
function finish(res: AuthResponse, welcome: string): void {
  setSession(res);
  const user = res.user;
  if (!user) return;
  toast(welcome);
  if (stay) hide(user);
  else location.assign('/portal/');
}

function requireFields(form: HTMLFormElement, data: Record<string, string>, rules: Record<string, string>): boolean {
  let ok = true;
  for (const [name, message] of Object.entries(rules)) {
    if (!data[name]) {
      fail(form, name, message);
      ok = false;
    }
  }
  if (!ok) $<HTMLElement>('[aria-invalid="true"]', form)?.focus();
  return ok;
}

function wireForms(root: HTMLElement): void {
  bind($<HTMLFormElement>('[data-form="signin"]', root), async (d, form) => {
    if (!requireFields(form, d, { identifier: 'Enter your username or email.', password: 'Enter your password.' })) return;
    const res = await api.post<AuthResponse>('/api/auth/login', { identifier: d['identifier'], password: d['password'] });
    finish(res, `Welcome back, ${res.user?.fullName.split(' ')[0] ?? ''}`);
  });

  bind($<HTMLFormElement>('[data-form="signup"]', root), async (d, form) => {
    if (!requireFields(form, d, { fullName: 'Tell us your name.', email: 'Enter your email address.', password: 'Choose a password.' })) return;
    if ((d['password'] ?? '').length < 10) {
      fail(form, 'password', 'Use at least 10 characters.');
      return;
    }
    const res = await api.post<AuthResponse>('/api/auth/register', { fullName: d['fullName'], email: d['email'], password: d['password'], company: d['company'] ?? '', currency: d['currency'] });
    const confirm = res.emailEnabled && res.user && !res.user.emailVerified;
    finish(res, confirm ? 'Account created. Check your email to confirm your address.' : 'Account created. Welcome!');
  });

  const mailForm = (name: 'forgot' | 'remind', endpoint: string, sent: string, noMail: string): void => {
    bind($<HTMLFormElement>(`[data-form="${name}"]`, root), async (d, form) => {
      if (!requireFields(form, d, { email: 'Enter your email address.' })) return;
      const res = await api.post<{ ok: true; emailEnabled: boolean }>(endpoint, { email: d['email'] });
      const done = $<HTMLElement>('[data-done]', form.closest('.auth-view') as HTMLElement);
      if (done) {
        done.textContent = res.emailEnabled ? sent : noMail;
        done.hidden = false;
      }
      form.hidden = true;
    });
  };
  mailForm('forgot', '/api/auth/forgot', 'If that email has an account, a link to choose a new password is on its way. It works for one hour.', `Email is not set up on this site yet. Please write to ${CFG.email} and we will get you back in.`);
  mailForm('remind', '/api/auth/remind', 'If that email has an account, we have sent it the sign-in details.', `Email is not set up on this site yet. Please write to ${CFG.email} and we will help you.`);
}

/* ---------- keyboard: Esc closes, Tab stays inside ---------- */

function trapTab(ev: KeyboardEvent): void {
  if (!modal || !isOpen()) return;
  if (ev.key === 'Escape') {
    ev.preventDefault();
    hide();
    return;
  }
  if (ev.key !== 'Tab') return;
  const items = $$<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])', modal).filter((e) => !e.closest('[hidden]') && e.offsetParent !== null);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  if (ev.shiftKey && document.activeElement === first) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && document.activeElement === last) {
    ev.preventDefault();
    first.focus();
  }
}

export function initAuthModal(): void {
  modal = $<HTMLElement>('#authModal');
  if (!modal) return;
  const root = modal;

  const brand = CFG.company.split(' ')[0] ?? CFG.company;
  $$<HTMLElement>('[data-brand-short]', root).forEach((s) => (s.textContent = brand));

  const cur = $<HTMLSelectElement>('#suCur', root);
  if (cur) {
    cur.innerHTML = CURRENCIES.map((c) => `<option value="${c.code}">${c.code} · ${c.name}</option>`).join('');
    cur.value = guessCurrency();
  }

  $$<HTMLElement>('[data-auth-close]', root).forEach((b) => b.addEventListener('click', () => hide()));
  document.addEventListener('keydown', trapTab);

  root.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const go = target.closest<HTMLElement>('[data-go]');
    if (go) {
      ev.preventDefault();
      setView(go.dataset['go'] as View);
      return;
    }
    const eye = target.closest<HTMLElement>('[data-eye]');
    if (eye) {
      const input = eye.parentElement?.querySelector<HTMLInputElement>('input');
      if (!input) return;
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      eye.setAttribute('aria-pressed', String(reveal));
      eye.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      eye.innerHTML = reveal ? EYE_OFF : EYE_ON;
      return;
    }
    const social = target.closest<HTMLElement>('[data-provider]');
    if (social) {
      const name = social.dataset['provider'] ?? '';
      toast(`${name.charAt(0).toUpperCase()}${name.slice(1)} sign-in is coming soon. Please use your email for now.`);
    }
  });
  $$<HTMLElement>('[data-eye]', root).forEach((b) => (b.innerHTML = EYE_ON));

  wireForms(root);

  // #/login and #/signup open the box; any other route closes it.
  onRoute((route) => {
    if (route.overlay) show(route.overlay === 'signup' ? 'signup' : 'signin');
    else if (isOpen()) hide();
  });
}
