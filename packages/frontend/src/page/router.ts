import { $, $$ } from '../core/dom.js';
import { CFG } from '../config.js';

/**
 * Tiny hash router. The site is still one document: its "pages" are the `.page[data-page]` blocks in
 * index.html and only the one named by `location.hash` (#/services, #/work/WRK-07, …) is visible.
 * Everything stays in memory across pages, so a studio design still reaches the quote form,
 * "Open this in the studio" still works, and so on.
 *
 * This module imports nothing from the sections (boot.ts registers the hooks), so sections can import
 * `navigate` from here without creating import cycles.
 */

export type PageId = 'home' | 'services' | 'work' | 'studio' | 'process' | 'contact';
export interface Route {
  page: PageId;
  /** Only the work page takes one: #/work/WRK-07 opens that build's detail modal. */
  param: string | null;
}

const SEGMENT: Record<PageId, string> = { home: '', services: 'services', work: 'work', studio: 'studio', process: 'process', contact: 'contact' };
const LABEL: Record<PageId, string> = { home: 'Home', services: 'What we build', work: 'Work', studio: 'Design studio', process: 'How we work', contact: 'Contact' };
const PAGES = Object.keys(SEGMENT) as PageId[];

/** Links from before the site had pages (#work, #quote, …) keep working. */
const LEGACY = new Map<string, string>([
  ['top', '/'],
  ['build', '/services'],
  ['work', '/work'],
  ['studio', '/studio'],
  ['process', '/process'],
  ['quote', '/contact'],
]);

type Hook = (route: Route, prev: Route | null) => void;
const enterHooks = new Map<PageId | '*', Hook[]>();
const leaveHooks = new Map<PageId, Hook[]>();
const routeHooks: Hook[] = [];
let current: Route | null = null;

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const path = LEGACY.get(raw) ?? raw;
  const [seg = '', param] = path.split('/').filter(Boolean);
  const page = PAGES.find((p) => SEGMENT[p] === seg) ?? 'home';
  let id: string | null = null;
  if (page === 'work' && param) {
    try {
      id = decodeURIComponent(param);
    } catch {
      id = null;
    }
  }
  return { page, param: id };
}

function pathOf(r: Route): string {
  const seg = SEGMENT[r.page];
  return '/' + (r.param ? `${seg}/${encodeURIComponent(r.param)}` : seg);
}

function run(list: Hook[] | undefined, route: Route, prev: Route | null): void {
  list?.forEach((fn) => {
    try {
      fn(route, prev);
    } catch (err) {
      console.error('[router] hook failed', err);
    }
  });
}

function scrollTop(smooth = false): void {
  const root = document.documentElement;
  if (smooth) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  root.style.scrollBehavior = 'auto'; // html has scroll-behavior:smooth; a page change should jump, not glide
  window.scrollTo(0, 0);
  root.style.scrollBehavior = '';
}

function titleFor(page: PageId): string {
  return page === 'home' ? `${CFG.company} — custom software, automation and enterprise dashboards` : `${LABEL[page]} — ${CFG.company}`;
}

function render(): void {
  const route = parse(location.hash);
  // Tidy legacy/unknown hashes in place (no new history entry). A bare "/" for Home stays as no hash at all.
  const canonical = '#' + pathOf(route);
  if (location.hash !== canonical && !(route.page === 'home' && location.hash === '')) {
    history.replaceState(null, '', canonical);
  }

  const prev = current;
  current = route;

  if (!prev || prev.page !== route.page) {
    if (prev) run(leaveHooks.get(prev.page), route, prev);
    $$<HTMLElement>('.page').forEach((el) => {
      el.hidden = el.dataset['page'] !== route.page;
    });
    $$<HTMLElement>('[data-route]').forEach((a) => {
      if (a.dataset['route'] === route.page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = titleFor(route.page);
    $('#mobmenu')?.classList.remove('open');
    $('#burger')?.setAttribute('aria-expanded', 'false');
    if (prev) scrollTop();
    run(enterHooks.get('*'), route, prev);
    run(enterHooks.get(route.page), route, prev);
    if (prev) {
      // Keyboard and screen-reader users land on the new page's heading instead of the link they pressed.
      const h = $<HTMLElement>(`.page[data-page="${route.page}"] h1`);
      if (h) {
        h.tabIndex = -1;
        h.focus({ preventScroll: true });
      }
    }
  }
  run(routeHooks, route, prev);
}

/** Go to a page: `navigate('work')`, `navigate('work/WRK-07')`, `navigate('')` for Home. */
export function navigate(path: string): void {
  const next = '#/' + path.replace(/^[#/]+/, '');
  if (location.hash === next) render();
  else location.hash = next; // fires hashchange -> render
}

/** Swap the URL for another route without adding a history entry or running any hooks (e.g. when a modal closes). */
export function replaceRoute(page: PageId, param: string | null = null): void {
  const route: Route = { page, param };
  history.replaceState(null, '', '#' + pathOf(route));
  current = route;
}

export function currentRoute(): Route {
  return current ?? parse(location.hash);
}

/** Runs when `page` (or '*' for every page) becomes visible. The page is already un-hidden, so sizes can be measured. */
export function onEnter(page: PageId | '*', fn: Hook): void {
  enterHooks.set(page, [...(enterHooks.get(page) ?? []), fn]);
}

/** Runs when `page` is about to be hidden. */
export function onLeave(page: PageId, fn: Hook): void {
  leaveHooks.set(page, [...(leaveHooks.get(page) ?? []), fn]);
}

/** Runs on every route change, including parameter-only ones (#/work -> #/work/WRK-07). */
export function onRoute(fn: Hook): void {
  routeHooks.push(fn);
}

export function initRouter(): void {
  addEventListener('hashchange', render);
  // Clicking the link for the page you are already on scrolls to the top instead of doing nothing.
  document.addEventListener('click', (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = (ev.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#/"]');
    if (!a) return;
    if (a.getAttribute('href') === (location.hash || '#/')) {
      ev.preventDefault();
      scrollTop(true);
    }
  });
  render();
}
