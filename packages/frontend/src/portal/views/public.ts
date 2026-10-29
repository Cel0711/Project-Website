import type { AuthResponse } from '@coreloop/shared';
import { api, ApiRequestError } from '../../api/client.js';
import { CFG } from '../../config.js';
import { $, esc } from '../../core/dom.js';

/**
 * The three screens reached from an email link, before anyone is signed in:
 *   #/verify/<token>  confirm an email address
 *   #/reset/<token>   choose a new password
 *   #/invite/<token>  choose a password for a new team account
 */
export type PublicKind = 'verify' | 'reset' | 'invite';

export function publicRoute(path: string): { kind: PublicKind; token: string } | null {
  const m = /^\/(verify|reset|invite)\/([^/]+)\/?$/.exec(path);
  return m ? { kind: m[1] as PublicKind, token: decodeURIComponent(m[2] ?? '') } : null;
}

function frame(inner: string): string {
  const [top = '', ...rest] = CFG.company.split(' ');
  return `<div class="pub"><div class="pub-card">
    <a class="brand pub-brand" href="/" aria-label="${esc(CFG.company)}"><img src="/lab-lace-emblem.png" alt="" width="45" height="54"><span><b class="brand-top">${esc(top.toUpperCase())}</b><i class="brand-sub">${esc(rest.join(' '))}</i></span></a>
    ${inner}</div></div>`;
}

const SIGN_IN = '<a class="btn btn-hi btn-lg" href="/#/login">Sign in</a>';

export async function renderPublic(app: HTMLElement, kind: PublicKind, token: string): Promise<void> {
  document.title = `${kind === 'verify' ? 'Confirm your email' : 'Choose a password'} — ${CFG.company}`;

  if (kind === 'verify') {
    app.innerHTML = frame('<h1 class="pub-t">Confirming your email…</h1><p class="sm">One moment.</p>');
    try {
      await api.post('/api/auth/verify', { token });
      app.innerHTML = frame(`<h1 class="pub-t">Email confirmed</h1><p class="sm">Thank you. Your address is verified, so you can now send quote requests.</p><div class="pub-act"><a class="btn btn-hi btn-lg" href="/portal/">Go to my dashboard</a></div>`);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Something went wrong.';
      app.innerHTML = frame(`<h1 class="pub-t">That link did not work</h1><p class="sm">${esc(msg)} Sign in and ask for a new confirmation email from your dashboard.</p><div class="pub-act">${SIGN_IN}</div>`);
    }
    return;
  }

  const invite = kind === 'invite';
  app.innerHTML = frame(`
    <h1 class="pub-t">${invite ? 'Welcome! Choose your password' : 'Choose a new password'}</h1>
    <p class="sm">${invite ? 'Your account is ready. Set a password to sign in.' : 'Pick something at least 10 characters long that you do not use anywhere else.'}</p>
    <form class="pub-form" id="pwForm" novalidate>
      <div class="fi"><label for="pw1">New password</label><input id="pw1" name="password" type="password" autocomplete="new-password" minlength="10" required></div>
      <div class="fi"><label for="pw2">Type it again</label><input id="pw2" name="again" type="password" autocomplete="new-password" required></div>
      <p class="pub-err" id="pwErr" role="alert" hidden></p>
      <button class="btn btn-hi btn-lg" type="submit">${invite ? 'Set password' : 'Save new password'}</button>
    </form>`);
  const form = $<HTMLFormElement>('#pwForm');
  const err = $<HTMLElement>('#pwErr');
  const show = (m: string): void => {
    if (err) {
      err.textContent = m;
      err.hidden = false;
    }
  };
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (err) err.hidden = true;
    const p1 = $<HTMLInputElement>('#pw1')?.value ?? '';
    const p2 = $<HTMLInputElement>('#pw2')?.value ?? '';
    if (p1.length < 10) return show('Use at least 10 characters.');
    if (p1 !== p2) return show('The two passwords do not match.');
    const btn = $<HTMLButtonElement>('button[type="submit"]', form);
    if (btn) btn.disabled = true;
    try {
      await api.post<AuthResponse | { ok: true }>('/api/auth/reset', { token, password: p1 });
      app.innerHTML = frame(`<h1 class="pub-t">All set</h1><p class="sm">Your password is saved. Sign in with it now.</p><div class="pub-act">${SIGN_IN}</div>`);
    } catch (e) {
      show(e instanceof ApiRequestError ? (e.issues.length ? e.issues.map((i) => i.replace(/^[^:]+:\s*/, '')).join(' ') : e.message) : 'Something went wrong.');
      if (btn) btn.disabled = false;
    }
  });
}
