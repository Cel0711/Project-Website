import { ApiRequestError } from '../api/client.js';
import { $, $$, esc } from '../core/dom.js';

/** One reusable dialog (the #dlg element in portal/index.html) for forms and confirmations. */

export interface DialogOptions {
  title: string;
  /** HTML for the body, usually form fields. */
  body: string;
  /** Label of the main button. Leave out for a read-only dialog that only closes. */
  submit?: string;
  danger?: boolean;
  wide?: boolean;
  /** Runs once the body is on screen, to wire up extra behaviour. */
  mount?(form: HTMLFormElement): void;
  /** Return false to keep the dialog open. Throw an ApiRequestError to show its message inside the dialog. */
  onSubmit?(data: Record<string, string>, form: HTMLFormElement): Promise<boolean | void>;
  onClose?(): void;
}

const X = '<svg width="15" height="15" viewBox="0 0 16 16" stroke="currentColor" stroke-width="1.6"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
let active: DialogOptions | null = null;
let opener: HTMLElement | null = null;

const root = (): HTMLElement | null => $<HTMLElement>('#dlg');

export function closeDialog(): void {
  const el = root();
  if (!el || !active) return;
  const done = active;
  active = null;
  el.classList.remove('open');
  document.body.style.overflow = '';
  opener?.focus?.({ preventScroll: true });
  done.onClose?.();
}

function collect(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((v, k) => {
    if (typeof v === 'string') out[k] = v.trim();
  });
  $$<HTMLInputElement>('input[type="checkbox"]', form).forEach((c) => {
    if (c.name) out[c.name] = c.checked ? 'on' : '';
  });
  $$<HTMLInputElement>('input[type="password"]', form).forEach((p) => (out[p.name] = p.value));
  return out;
}

export function openDialog(o: DialogOptions): void {
  const el = root();
  const card = $<HTMLElement>('#dlgCard');
  if (!el || !card) return;
  if (active) closeDialog();
  active = o;
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  card.classList.toggle('dlg-wide', !!o.wide);
  card.innerHTML =
    `<header class="dlg-h"><h2 id="dlgTitle">${esc(o.title)}</h2><button class="iconbtn" type="button" data-dlg-close aria-label="Close">${X}</button></header>` +
    `<form class="dlg-form" novalidate><div class="dlg-b">${o.body}</div><p class="dlg-err" role="alert" hidden></p>` +
    `<footer class="dlg-f"><button class="btn btn-line" type="button" data-dlg-close>${o.submit ? 'Cancel' : 'Close'}</button>` +
    (o.submit ? `<button class="btn ${o.danger ? 'btn-danger' : 'btn-hi'}" type="submit">${esc(o.submit)}</button>` : '') +
    `</footer></form>`;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';

  const form = $<HTMLFormElement>('.dlg-form', card)!;
  const err = $<HTMLElement>('.dlg-err', card)!;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!o.onSubmit) return;
    const btn = $<HTMLButtonElement>('[type="submit"]', form);
    const label = btn?.textContent ?? '';
    err.hidden = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Please wait…';
    }
    try {
      const keep = await o.onSubmit(collect(form), form);
      if (keep !== false) closeDialog();
    } catch (e) {
      err.textContent = e instanceof ApiRequestError ? (e.issues.length ? e.issues.map((i) => i.replace(/^[^:]+:\s*/, '')).join(' ') : e.message) : 'Something went wrong. Please try again.';
      err.hidden = false;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
    }
  });
  o.mount?.(form);
  setTimeout(() => $<HTMLElement>('input:not([type="hidden"]):not([disabled]),select,textarea', form)?.focus({ preventScroll: true }), 30);
}

/** Resolves true when the person confirms, false when they cancel or close it. */
export function confirmDialog(title: string, message: string, confirm = 'Confirm', danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    openDialog({
      title,
      body: `<p class="dlg-msg">${message}</p>`,
      submit: confirm,
      danger,
      onSubmit: async () => {
        answered = true;
        resolve(true);
      },
      onClose: () => {
        if (!answered) resolve(false);
      },
    });
  });
}

export function initDialog(): void {
  const el = root();
  el?.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('[data-dlg-close]')) closeDialog();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && active) closeDialog();
  });
}
