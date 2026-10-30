import type { ConversationSummary, NotificationItem, PublicUser, UserRole } from '@coreloop/shared';
import { api } from '../api/client.js';
import { initialsOf, signOut } from '../auth/session.js';
import { CFG } from '../config.js';
import { $, $$, esc } from '../core/dom.js';
import { onLive } from './live.js';
import { ago } from './ui.js';

/** The frame around every signed-in screen: sidebar, top bar, bell, account menu and the one place a screen is drawn. */

const ICON = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  doc: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
  user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  chart: 'M4 19V9M10 19V5M16 19v-6M22 19H2',
  wallet: 'M3 7h18v12H3zM3 7l3-4h12l3 4M16 13h2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  out: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
} as const;
type IconName = keyof typeof ICON;

const svg = (name: IconName, size = 18): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[name]}"/></svg>`;

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  badge?: 'messages';
  section?: string;
}

const NAV: Record<UserRole, NavItem[]> = {
  client: [
    { path: '/', label: 'Overview', icon: 'home' },
    { path: '/new', label: 'Get a quote', icon: 'plus' },
    { path: '/requests', label: 'My requests', icon: 'list' },
    { path: '/messages', label: 'Messages', icon: 'chat', badge: 'messages' },
    { path: '/invoices', label: 'Invoices', icon: 'doc' },
    { path: '/profile', label: 'Profile', icon: 'user' },
  ],
  admin: [
    { path: '/', label: 'Dashboard', icon: 'home' },
    { path: '/requests', label: 'Requests', icon: 'list' },
    { path: '/messages', label: 'Messages', icon: 'chat', badge: 'messages' },
    { path: '/clients', label: 'Clients', icon: 'users' },
    { path: '/finance', label: 'Overview', icon: 'chart', section: 'Finance' },
    { path: '/finance/invoices', label: 'Invoices', icon: 'doc' },
    { path: '/finance/payments', label: 'Payments', icon: 'wallet' },
    { path: '/users', label: 'Team', icon: 'user', section: 'Admin' },
    { path: '/audit', label: 'Audit log', icon: 'shield' },
    { path: '/profile', label: 'Profile', icon: 'user' },
  ],
  finance: [
    { path: '/finance', label: 'Overview', icon: 'chart' },
    { path: '/finance/invoices', label: 'Invoices', icon: 'doc' },
    { path: '/finance/payments', label: 'Payments', icon: 'wallet' },
    { path: '/finance/clients', label: 'Client balances', icon: 'users' },
    { path: '/requests', label: 'Requests', icon: 'list', section: 'Reference' },
    { path: '/profile', label: 'Profile', icon: 'user' },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = { admin: 'Admin', finance: 'Finance', client: 'Client' };

export interface Shell {
  /** Where the current screen is drawn. */
  view: HTMLElement;
  setActive(path: string): void;
  setTitle(title: string): void;
  banner(html: string | null): void;
  refresh(): void;
}

function applyStoredTheme(): void {
  try {
    const saved = sessionStorage.getItem('cl_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch {
    /* storage may be blocked; the theme just will not persist */
  }
}

function toggleTheme(): void {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try {
    sessionStorage.setItem('cl_theme', next);
  } catch {
    /* same as above */
  }
}

export { applyStoredTheme };

export function buildShell(app: HTMLElement, user: PublicUser, go: (path: string) => void): Shell {
  const [top = '', ...rest] = CFG.company.split(' ');
  const items = NAV[user.role];
  let section = '';
  const nav = items
    .map((i) => {
      const head = i.section && i.section !== section ? `<p class="side-sec">${esc(i.section)}</p>` : '';
      if (i.section) section = i.section;
      return `${head}<a class="side-a" href="#${i.path}" data-nav="${i.path}">${svg(i.icon)}<span>${esc(i.label)}</span>${i.badge ? `<b class="nbadge" data-badge="${i.badge}" hidden>0</b>` : ''}</a>`;
    })
    .join('');

  app.innerHTML = `
  <div class="app">
    <aside class="side" id="side" aria-label="Main menu">
      <a class="brand side-brand" href="#${user.role === 'finance' ? '/finance' : '/'}" aria-label="${esc(CFG.company)}">
        <img src="/lab-lace-emblem.png" alt="" width="45" height="54">
        <span><b class="brand-top">${esc(top.toUpperCase())}</b><i class="brand-sub">${esc(rest.join(' '))}</i></span>
      </a>
      <nav class="side-nav" id="sideNav">${nav}</nav>
      <div class="side-foot">
        <a class="side-a" href="/">${svg('globe')}<span>Back to website</span></a>
      </div>
    </aside>
    <div class="side-scrim" id="scrim"></div>
    <div class="main">
      <header class="top">
        <button class="iconbtn side-toggle" id="sideBtn" type="button" aria-label="Open menu" aria-expanded="false">${svg('menu', 17)}</button>
        <p class="top-title" id="topTitle"></p>
        <div class="top-act">
          ${user.role === 'client' ? '<a class="btn btn-hi btn-sm top-cta" href="#/new">Get a quote</a>' : ''}
          <button class="iconbtn" id="themeBtn" type="button" aria-label="Switch colour theme" title="Switch colour theme">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9L13 13M13 3l-1.1 1.1M4.1 11.9L3 13"/></svg>
          </button>
          <div class="bell" id="bell">
            <button class="iconbtn" id="bellBtn" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">${svg('bell', 17)}<b class="bell-n" id="bellN" hidden>0</b></button>
            <div class="bell-pop" id="bellPop" hidden></div>
          </div>
          <div class="acct" id="acct">
            <button class="acct-btn" id="acctBtn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu"><span class="acct-av">${esc(initialsOf(user.fullName))}</span><span class="acct-name">${esc(user.fullName)}</span></button>
            <div class="acct-menu" id="acctMenu" role="menu" hidden>
              <div class="acct-who"><b>${esc(user.fullName)}</b>${esc(user.email)} · ${ROLE_LABEL[user.role]}</div>
              <a role="menuitem" href="#/profile">Profile and password</a>
              <a role="menuitem" href="/">Back to website</a>
              <button role="menuitem" type="button" id="signOutBtn">Sign out</button>
            </div>
          </div>
        </div>
      </header>
      <div class="banner" id="banner" hidden></div>
      <main class="view" id="view" tabindex="-1"></main>
    </div>
  </div>`;

  const body = document.body;
  const closeSide = (): void => {
    body.classList.remove('side-open');
    $('#sideBtn')?.setAttribute('aria-expanded', 'false');
  };
  $('#sideBtn')?.addEventListener('click', () => {
    const open = body.classList.toggle('side-open');
    $('#sideBtn')?.setAttribute('aria-expanded', String(open));
  });
  $('#scrim')?.addEventListener('click', closeSide);
  $('#sideNav')?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('a')) closeSide();
  });
  $('#themeBtn')?.addEventListener('click', toggleTheme);

  /* ----- popovers: bell and account ----- */
  const pops = [
    { btn: '#bellBtn', pop: '#bellPop' },
    { btn: '#acctBtn', pop: '#acctMenu' },
  ];
  const closePops = (except = ''): void => {
    for (const p of pops) {
      if (p.pop === except) continue;
      $<HTMLElement>(p.pop)?.setAttribute('hidden', '');
      $(p.btn)?.setAttribute('aria-expanded', 'false');
    }
  };
  for (const p of pops) {
    $(p.btn)?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const el = $<HTMLElement>(p.pop);
      if (!el) return;
      const open = el.hidden;
      closePops(open ? p.pop : '');
      el.hidden = !open;
      $(p.btn)?.setAttribute('aria-expanded', String(open));
      if (open && p.pop === '#bellPop') void loadBell();
    });
  }
  document.addEventListener('click', (ev) => {
    if (!(ev.target as HTMLElement).closest('#bell,#acct')) closePops();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closePops();
  });
  $('#acctMenu')?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('a')) closePops();
  });
  $('#signOutBtn')?.addEventListener('click', async () => {
    await signOut();
    location.assign('/');
  });

  /* ----- bell ----- */
  let items_: NotificationItem[] = [];
  const renderBell = (): void => {
    const pop = $<HTMLElement>('#bellPop');
    if (!pop) return;
    pop.innerHTML =
      `<div class="bell-h"><b>Notifications</b><button type="button" data-readall>Mark all as read</button></div>` +
      (items_.length
        ? `<ul class="bell-l">${items_
            .map((n) => `<li class="bell-i${n.readAt ? '' : ' unread'}" data-id="${n.id}" data-link="${esc(n.link)}" tabindex="0"><b>${esc(n.title)}</b>${n.body ? `<span>${esc(n.body)}</span>` : ''}<time>${esc(ago(n.createdAt))}</time></li>`)
            .join('')}</ul>`
        : '<p class="bell-none">Nothing yet. Updates on your requests, messages and invoices appear here.</p>');
  };
  async function loadBell(): Promise<void> {
    try {
      const r = await api.get<{ items: NotificationItem[]; unread: number }>('/api/notifications');
      items_ = r.items;
      renderBell();
      setBellCount(r.unread);
    } catch {
      /* the bell is a convenience; stay quiet if it cannot load */
    }
  }
  function setBellCount(n: number): void {
    const b = $<HTMLElement>('#bellN');
    if (!b) return;
    b.textContent = n > 99 ? '99+' : String(n);
    b.hidden = n < 1;
  }
  $('#bellPop')?.addEventListener('click', async (ev) => {
    const t = ev.target as HTMLElement;
    if (t.closest('[data-readall]')) {
      await api.post('/api/notifications/read', {}).catch(() => undefined);
      void loadBell();
      return;
    }
    const li = t.closest<HTMLElement>('.bell-i');
    if (!li) return;
    const id = Number(li.dataset['id']);
    closePops();
    if (li.classList.contains('unread')) await api.post('/api/notifications/read', { ids: [id] }).catch(() => undefined);
    go(li.dataset['link'] || '/');
    void refresh();
  });
  $('#bellPop')?.addEventListener('keydown', (ev) => {
    if ((ev as KeyboardEvent).key === 'Enter') ($(`.bell-i:focus`) as HTMLElement | null)?.click();
  });

  /* ----- counts: bell + unread messages ----- */
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function refreshNow(): Promise<void> {
    // Until a temporary password has been replaced the server answers only the password screens.
    if (document.body.classList.contains('must-change')) return;
    try {
      const n = await api.get<{ items: NotificationItem[]; unread: number }>('/api/notifications');
      setBellCount(n.unread);
      items_ = n.items;
      if (!$<HTMLElement>('#bellPop')?.hidden) renderBell();
    } catch {
      /* ignore */
    }
    if (user.role !== 'finance') {
      try {
        const c = await api.get<{ conversations: ConversationSummary[] }>('/api/conversations');
        const unread = c.conversations.reduce((a, x) => a + x.unread, 0);
        $$<HTMLElement>('[data-badge="messages"]').forEach((b) => {
          b.textContent = String(unread);
          b.hidden = unread < 1;
        });
      } catch {
        /* ignore */
      }
    }
  }
  function refresh(): void {
    clearTimeout(timer);
    timer = setTimeout(() => void refreshNow(), 250);
  }
  onLive((m) => {
    if (m.type === 'notification' || m.type === 'message' || m.type === 'resync') refresh();
  });
  refresh();

  return {
    view: $<HTMLElement>('#view')!,
    setActive(path) {
      // the longest matching menu entry is the current one
      let best: HTMLElement | null = null;
      let bestLen = -1;
      $$<HTMLElement>('[data-nav]').forEach((a) => {
        const p = a.dataset['nav'] ?? '';
        const hit = p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`);
        if (hit && p.length > bestLen) {
          best = a;
          bestLen = p.length;
        }
        a.removeAttribute('aria-current');
      });
      (best as HTMLElement | null)?.setAttribute('aria-current', 'page');
    },
    setTitle(title) {
      const t = $('#topTitle');
      if (t) t.textContent = title;
      document.title = `${title} — ${CFG.company}`;
    },
    banner(html) {
      const b = $<HTMLElement>('#banner');
      if (!b) return;
      b.hidden = !html;
      b.innerHTML = html ?? '';
    },
    refresh,
  };
}
