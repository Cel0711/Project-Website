// The nav's side of signing in: a "Sign in" button for visitors, an account chip with a menu once signed in.
import type { AuthResponse } from '@coreloop/shared';
import { initialsOf, loadSession, onSession, signOut } from '../../auth/session.js';
import { $, $$, esc, toast } from '../../core/dom.js';

const ROLE_LABEL = { admin: 'Admin', finance: 'Finance', client: 'Client' } as const;

function render(s: AuthResponse): void {
  const user = s.user;
  const signIn = $<HTMLElement>('#signInBtn');
  const acct = $<HTMLElement>('#acct');
  if (signIn) signIn.hidden = !!user;
  if (acct) acct.hidden = !user;
  $$<HTMLElement>('[data-auth="guest"]').forEach((e) => (e.hidden = !!user));
  $$<HTMLElement>('[data-auth="user"]').forEach((e) => (e.hidden = !user));
  if (!user) {
    closeMenu();
    return;
  }
  const av = $('#acctAv');
  if (av) av.textContent = initialsOf(user.fullName);
  const nm = $('#acctName');
  if (nm) nm.textContent = user.fullName;
  const who = $('#acctWho');
  if (who) who.innerHTML = `<b>${esc(user.fullName)}</b>${esc(user.email)} · ${ROLE_LABEL[user.role]}`;
}

function closeMenu(): void {
  $('#acctMenu')?.setAttribute('hidden', '');
  $('#acctBtn')?.setAttribute('aria-expanded', 'false');
}

export function initNavAccount(): void {
  onSession(render);
  void loadSession().then(render);

  $('#acctBtn')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const menu = $<HTMLElement>('#acctMenu');
    if (!menu) return;
    const open = menu.hidden;
    menu.hidden = !open;
    $('#acctBtn')?.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (ev) => {
    if (!(ev.target as HTMLElement).closest('#acct')) closeMenu();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', async (ev) => {
    if (!(ev.target as HTMLElement).closest('[data-signout]')) return;
    ev.preventDefault();
    closeMenu();
    await signOut();
    toast('You are signed out.');
  });
}
