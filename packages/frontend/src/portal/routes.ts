import type { PublicUser, UserRole } from '@coreloop/shared';
import type { LiveMessage } from './live.js';

/** What a screen (view) is handed when it is shown. */
export interface ViewCtx {
  /** A fresh element for this screen; its listeners disappear with it. */
  root: HTMLElement;
  user: PublicUser;
  params: Record<string, string>;
  query: URLSearchParams;
  /** False once the person has moved on: async work should stop touching the page. */
  alive(): boolean;
  setTitle(title: string): void;
  go(path: string): void;
  onLive(fn: (m: LiveMessage) => void): void;
  /** Runs when the screen is left (timers, listeners on document). */
  cleanup(fn: () => void): void;
  /** Re-reads the bell and the unread badges. */
  refresh(): void;
  /** Re-reads who is signed in (after a profile or password change). */
  reloadUser(): Promise<PublicUser>;
}

export type View = (ctx: ViewCtx) => Promise<void> | void;

export interface RouteDef {
  path: string;
  roles: UserRole[];
  title: string;
  load: () => Promise<{ default: View }>;
}

const ALL: UserRole[] = ['client', 'admin', 'finance'];
const STAFF: UserRole[] = ['admin', 'finance'];

/**
 * Every screen, by address. The same address can belong to different screens for different roles
 * (a client's /requests is not the team's /requests). First match wins, so specific paths come first.
 * Screens are loaded on demand, so a client never downloads the Admin or Finance code.
 */
export const ROUTES: RouteDef[] = [
  // client
  { path: '/', roles: ['client'], title: 'Overview', load: () => import('./views/client/overview.js') },
  { path: '/new', roles: ['client'], title: 'Get a quote', load: () => import('./views/client/new-request.js') },
  { path: '/requests', roles: ['client'], title: 'My requests', load: () => import('./views/client/requests.js') },
  { path: '/requests/:id', roles: ['client'], title: 'Request', load: () => import('./views/client/request-detail.js') },
  { path: '/invoices', roles: ['client'], title: 'Invoices', load: () => import('./views/client/invoices.js') },
  { path: '/invoices/:id', roles: ['client'], title: 'Invoice', load: () => import('./views/invoice-detail.js') },
  // chat: clients and Admins
  { path: '/messages', roles: ['client', 'admin'], title: 'Messages', load: () => import('./views/messages.js') },
  { path: '/messages/:id', roles: ['client', 'admin'], title: 'Messages', load: () => import('./views/messages.js') },
  // team
  { path: '/', roles: ['admin'], title: 'Dashboard', load: () => import('./views/admin/dashboard.js') },
  { path: '/requests', roles: STAFF, title: 'Requests', load: () => import('./views/staff/requests.js') },
  { path: '/requests/:id', roles: STAFF, title: 'Request', load: () => import('./views/staff/request-detail.js') },
  { path: '/clients', roles: ['admin'], title: 'Clients', load: () => import('./views/admin/clients.js') },
  { path: '/users', roles: ['admin'], title: 'Team', load: () => import('./views/admin/users.js') },
  { path: '/audit', roles: ['admin'], title: 'Audit log', load: () => import('./views/admin/audit.js') },
  // finance (Finance and Admin)
  { path: '/finance', roles: STAFF, title: 'Finance', load: () => import('./views/finance/overview.js') },
  { path: '/finance/invoices', roles: STAFF, title: 'Invoices', load: () => import('./views/finance/invoices.js') },
  { path: '/finance/invoices/new', roles: STAFF, title: 'New invoice', load: () => import('./views/finance/invoice-form.js') },
  { path: '/finance/invoices/:id/edit', roles: STAFF, title: 'Edit invoice', load: () => import('./views/finance/invoice-form.js') },
  { path: '/finance/invoices/:id', roles: STAFF, title: 'Invoice', load: () => import('./views/invoice-detail.js') },
  { path: '/finance/payments', roles: STAFF, title: 'Payments', load: () => import('./views/finance/payments.js') },
  { path: '/finance/clients', roles: STAFF, title: 'Client balances', load: () => import('./views/finance/balances.js') },
  // everyone
  { path: '/profile', roles: ALL, title: 'Profile', load: () => import('./views/profile.js') },
];

const compiled = ROUTES.map((def) => ({
  def,
  re: new RegExp('^' + def.path.replace(/:[^/]+/g, '([^/]+)') + '/?$'),
  keys: [...def.path.matchAll(/:([^/]+)/g)].map((m) => m[1] ?? ''),
}));

export interface Match {
  def: RouteDef;
  params: Record<string, string>;
}

export function matchRoute(path: string, role: UserRole): Match | null {
  for (const c of compiled) {
    if (!c.def.roles.includes(role)) continue;
    const m = c.re.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    c.keys.forEach((k, i) => {
      try {
        params[k] = decodeURIComponent(m[i + 1] ?? '');
      } catch {
        params[k] = m[i + 1] ?? '';
      }
    });
    return { def: c.def, params };
  }
  return null;
}

/** Where a signed-in person lands when they open the portal. */
export const HOME: Record<UserRole, string> = { client: '/', admin: '/', finance: '/finance' };

/** "#/requests/QT-1?x=1" -> { path: "/requests/QT-1", query } */
export function readHash(): { path: string; query: URLSearchParams } {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [p = '/', q = ''] = raw.split('?');
  return { path: p.startsWith('/') ? p : `/${p}`, query: new URLSearchParams(q) };
}

export function navigate(path: string): void {
  const next = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (location.hash === next) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = next;
}
