import type { PublicUser } from '@coreloop/shared';
import { api, apiEvents, ApiRequestError } from '../api/client.js';
import { loadSession, setSession } from '../auth/session.js';
import { $ } from '../core/dom.js';
import { initDialog } from './dialog.js';
import { onLive, startLive } from './live.js';
import { HOME, matchRoute, navigate, readHash, type ViewCtx } from './routes.js';
import { applyStoredTheme, buildShell, type Shell } from './shell.js';
import { empty, errorBox, loading } from './ui.js';
import { publicRoute, renderPublic } from './views/public.js';

/** Starts the signed-in app: who are you, draw the frame, then show the screen the address asks for. */
export async function startPortal(): Promise<void> {
  const app = $<HTMLElement>('#app');
  if (!app) return;
  applyStoredTheme();
  initDialog();

  // Email links work before anyone is signed in.
  const pub = publicRoute(readHash().path);
  if (pub) {
    window.addEventListener('hashchange', () => location.reload());
    await renderPublic(app, pub.kind, pub.token);
    return;
  }

  const session = await loadSession();
  if (!session.user) {
    location.replace('/#/login');
    return;
  }
  let me: PublicUser = session.user;

  apiEvents.addEventListener('unauthorized', () => {
    setSession({ ok: true, user: null, emailEnabled: session.emailEnabled });
    location.replace('/#/login');
  });

  const shell: Shell = buildShell(app, me, navigate);
  startLive();

  /** The strip under the top bar: things that need attention before anything else. */
  const banner = (): void => {
    document.body.classList.toggle('must-change', me.mustChangePassword);
    if (me.mustChangePassword) {
      shell.banner('<b>Choose a new password.</b> Your account uses a temporary password. Set your own below to continue.');
    } else if (me.role === 'client' && !me.emailVerified) {
      shell.banner(`<b>Confirm your email address.</b> We sent a link to ${me.email}. You need it to send requests and messages. <button type="button" class="linkbtn" id="resendVerify">Send it again</button>`);
      $('#resendVerify')?.addEventListener('click', async (ev) => {
        const b = ev.currentTarget as HTMLButtonElement;
        b.disabled = true;
        try {
          await api.post('/api/auth/resend-verification', {});
          b.textContent = 'Sent. Check your inbox.';
        } catch (e) {
          b.disabled = false;
          b.textContent = e instanceof ApiRequestError ? e.message : 'Could not send. Try again.';
        }
      });
    } else shell.banner(null);
  };
  banner();

  /** Re-reads who is signed in (after a profile change, or once a temporary password has been replaced). */
  async function reloadUser(): Promise<PublicUser> {
    const s = await loadSession(true);
    if (s.user) me = s.user;
    banner();
    shell.refresh(); // the bell and unread counts can load now
    return me;
  }

  const cleanups: Array<() => void> = [];
  let token = 0;

  async function render(): Promise<void> {
    const mine = ++token;
    cleanups.splice(0).forEach((fn) => {
      try {
        fn();
      } catch {
        /* a screen's cleanup must never block the next one */
      }
    });
    const { path, query } = readHash();

    if (me.mustChangePassword && path !== '/profile') {
      navigate('/profile?force=1');
      return;
    }
    const match = matchRoute(path, me.role);
    const root = document.createElement('div');
    root.className = 'view-in';
    shell.view.replaceChildren(root);
    shell.setActive(path);
    window.scrollTo(0, 0);

    if (!match) {
      if (path === '/' && HOME[me.role] !== '/') {
        navigate(HOME[me.role]);
        return;
      }
      shell.setTitle('Not found');
      root.innerHTML = empty('That page does not exist', 'Check the address, or use the menu.', '<a class="btn btn-hi" href="#/">Go to the start</a>');
      return;
    }

    shell.setTitle(match.def.title);
    root.innerHTML = loading();
    const ctx: ViewCtx = {
      root,
      user: me,
      params: match.params,
      query,
      alive: () => mine === token,
      setTitle: (t) => {
        if (mine === token) shell.setTitle(t);
      },
      go: navigate,
      onLive: (fn) => cleanups.push(onLive(fn)),
      cleanup: (fn) => cleanups.push(fn),
      refresh: () => shell.refresh(),
      reloadUser,
    };

    try {
      const mod = await match.def.load();
      if (mine !== token) return;
      root.innerHTML = '';
      await mod.default(ctx);
    } catch (err) {
      if (mine !== token) return;
      const status = err instanceof ApiRequestError ? err.status : 0;
      root.innerHTML =
        status === 404
          ? empty('We could not find that', 'It may have been removed, or it belongs to someone else.', '<a class="btn btn-hi" href="#/">Go to the start</a>')
          : errorBox(err instanceof Error ? err.message : 'Something went wrong.');
      $<HTMLElement>('[data-retry]', root)?.addEventListener('click', () => void render());
      return;
    }
    if (mine === token) root.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', () => void render());
  await render();
}
