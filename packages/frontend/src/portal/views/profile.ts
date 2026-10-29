import { CURRENCIES, type AuthResponse, type SessionInfo } from '@coreloop/shared';
import { api, ApiRequestError } from '../../api/client.js';
import { $, esc, toast } from '../../core/dom.js';
import type { View } from '../routes.js';
import { card, ago, field, options, pageHead } from '../ui.js';

/** "Chrome on Windows" from a user-agent string. */
function device(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'A browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'an unknown device';
  return `${browser} on ${os}`;
}

function problem(err: unknown): string {
  if (!(err instanceof ApiRequestError)) return 'Something went wrong. Please try again.';
  return err.issues.length ? err.issues.map((i) => i.replace(/^[^:]+:\s*/, '')).join(' ') : err.message;
}

function show(box: HTMLElement | null, message: string, ok = false): void {
  if (!box) return;
  box.textContent = message;
  box.className = ok ? 'form-ok' : 'form-err';
  box.hidden = !message;
}

const view: View = async (ctx) => {
  const u = ctx.user;
  const force = u.mustChangePassword;

  const profileCard = card(
    'Your details',
    `<form id="profileForm" class="stack" novalidate>
      <div class="f2">${field('Full name', `<input id="pfName" name="fullName" value="${esc(u.fullName)}" autocomplete="name" required>`, { id: 'pfName' })}${field('Username <span class="muted">(optional)</span>', `<input id="pfUser" name="username" value="${esc(u.username ?? '')}" autocomplete="username" autocapitalize="off">`, { id: 'pfUser', hint: 'You can sign in with it instead of your email.' })}</div>
      <div class="f2">${field('Company <span class="muted">(optional)</span>', `<input id="pfCo" name="company" value="${esc(u.company)}" autocomplete="organization">`, { id: 'pfCo' })}${field('Phone or WhatsApp <span class="muted">(optional)</span>', `<input id="pfPh" name="phone" value="${esc(u.phone)}" autocomplete="tel">`, { id: 'pfPh' })}</div>
      <div class="f2">${field('Email', `<input id="pfMail" value="${esc(u.email)}" disabled>`, { id: 'pfMail', hint: u.emailVerified ? 'Confirmed.' : 'Not confirmed yet.' })}${field('Your currency', `<select id="pfCur" name="currency">${options(CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })), u.currency)}</select>`, { id: 'pfCur', hint: 'Quotes and invoices are shown in this currency by default.' })}</div>
      <p id="pfMsg" hidden></p>
      <div><button class="btn btn-hi" type="submit">Save changes</button></div>
    </form>`,
  );

  const passwordCard = card(
    force ? 'Choose a new password' : 'Password',
    `${force ? '<p class="muted">You signed in with a temporary password. Choose your own to continue.</p>' : ''}
     <form id="pwForm" class="stack" novalidate>
      ${field('Current password', '<input id="pwCur" name="currentPassword" type="password" autocomplete="current-password" required>', { id: 'pwCur' })}
      <div class="f2">${field('New password', '<input id="pwNew" name="newPassword" type="password" autocomplete="new-password" minlength="10" required>', { id: 'pwNew', hint: 'At least 10 characters.' })}${field('Type it again', '<input id="pwAgain" name="again" type="password" autocomplete="new-password" required>', { id: 'pwAgain' })}</div>
      <p id="pwMsg" hidden></p>
      <div><button class="btn btn-hi" type="submit">Change password</button></div>
    </form>`,
  );

  ctx.root.innerHTML = pageHead(force ? 'Choose a new password' : 'Profile and password', force ? '' : 'Your details, your password, and where you are signed in.') + (force ? '' : profileCard) + passwordCard + (force ? '' : `<div id="devices"></div>`);

  const pfMsg = $<HTMLElement>('#pfMsg', ctx.root);
  $<HTMLFormElement>('#profileForm', ctx.root)?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget as HTMLFormElement);
    const username = String(f.get('username') ?? '').trim();
    try {
      await api.patch<AuthResponse>('/api/me', { fullName: String(f.get('fullName') ?? '').trim(), company: String(f.get('company') ?? '').trim(), phone: String(f.get('phone') ?? '').trim(), currency: f.get('currency'), username: username || null });
      await ctx.reloadUser();
      show(pfMsg, 'Saved.', true);
      toast('Profile saved');
    } catch (e) {
      show(pfMsg, problem(e));
    }
  });

  const pwMsg = $<HTMLElement>('#pwMsg', ctx.root);
  $<HTMLFormElement>('#pwForm', ctx.root)?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget as HTMLFormElement; // read now: currentTarget is gone after the first await
    const f = new FormData(form);
    const next = String(f.get('newPassword') ?? '');
    if (next.length < 10) return show(pwMsg, 'Use at least 10 characters for the new password.');
    if (next !== String(f.get('again') ?? '')) return show(pwMsg, 'The two new passwords do not match.');
    try {
      await api.post('/api/me/password', { currentPassword: String(f.get('currentPassword') ?? ''), newPassword: next });
      const wasForced = force;
      await ctx.reloadUser();
      form.reset();
      show(pwMsg, 'Password changed. Other devices have been signed out.', true);
      toast('Password changed');
      if (wasForced) ctx.go('/');
    } catch (e) {
      show(pwMsg, problem(e));
    }
  });

  if (force) return;
  const devices = $<HTMLElement>('#devices', ctx.root);
  async function loadDevices(): Promise<void> {
    const r = await api.get<{ sessions: SessionInfo[] }>('/api/me/sessions');
    if (!ctx.alive() || !devices) return;
    devices.innerHTML = card(
      'Where you are signed in',
      `<ul class="devs">${r.sessions.map((s) => `<li><div><b>${esc(device(s.userAgent))}</b>${s.current ? ' <span class="badge b-ok">This device</span>' : ''}<small class="muted">${esc(s.ip || 'unknown address')} · active ${esc(ago(s.lastSeenAt))}</small></div>${s.current ? '' : `<button class="btn btn-line btn-sm" type="button" data-revoke="${esc(s.id)}">Sign out</button>`}</li>`).join('')}</ul>`,
    );
  }
  await loadDevices();
  devices?.addEventListener('click', async (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-revoke]');
    if (!b) return;
    await api.del(`/api/me/sessions/${encodeURIComponent(b.dataset['revoke'] ?? '')}`).catch(() => undefined);
    toast('Signed out on that device');
    void loadDevices();
  });
};

export default view;
