import { CURRENCIES, formatMoney, type CurrencyCode, type Invoice, type QuoteSummary } from '@coreloop/shared';
import { api, ApiRequestError } from '../../../api/client.js';
import { $, $$, esc, toast } from '../../../core/dom.js';
import type { View } from '../../routes.js';
import { field, inDaysIso, options, pageHead } from '../../ui.js';

interface ClientOption {
  id: string;
  fullName: string;
  email: string;
  company: string;
  currency: string;
}

interface Line {
  description: string;
  qty: string;
  unitPrice: string;
}

/** Same arithmetic as the server (whole cents), so the totals shown here are the totals that get saved. */
function totals(lines: Line[], taxRate: number): { subtotal: number; tax: number; total: number; amounts: number[] } {
  const amounts = lines.map((l) => Math.round((Math.round((Number(l.qty) || 0) * 100) * Math.round((Number(l.unitPrice) || 0) * 100)) / 100));
  const subtotal = amounts.reduce((a, b) => a + b, 0);
  const tax = Math.round((subtotal * Math.round(taxRate * 100)) / 10000);
  return { subtotal, tax, total: subtotal + tax, amounts };
}

/** Create a new invoice, or edit a draft. Opened from an approved request it arrives filled in. */
const view: View = async (ctx) => {
  const editId = ctx.params['id'] ?? '';
  const editing = !!editId;
  const clients = (await api.get<{ clients: ClientOption[] }>('/api/finance/clients')).clients;

  let existing: Invoice | null = null;
  if (editing) {
    existing = (await api.get<{ invoice: Invoice }>(`/api/finance/invoices/${encodeURIComponent(editId)}`)).invoice;
    if (existing.status !== 'draft') {
      ctx.go(`/finance/invoices/${encodeURIComponent(editId)}`);
      return;
    }
  }
  if (!ctx.alive()) return;

  let clientId = existing?.client.id ?? ctx.query.get('client') ?? clients[0]?.id ?? '';
  let quoteId = existing?.quoteId ?? ctx.query.get('quote') ?? '';
  let currency = (existing?.currency ?? ctx.query.get('currency') ?? clients.find((c) => c.id === clientId)?.currency ?? 'USD') as string;
  let lines: Line[] = existing ? existing.items.map((i) => ({ description: i.description, qty: String(Number(i.qty)), unitPrice: String(Number(i.unitPrice)) })) : [];
  let quotes: QuoteSummary[] = [];

  async function loadQuotes(): Promise<void> {
    quotes = clientId ? (await api.get<{ quotes: QuoteSummary[] }>(`/api/admin/quotes?clientId=${encodeURIComponent(clientId)}&limit=50`)).quotes.filter((q) => ['accepted', 'building', 'delivered'].includes(q.status)) : [];
  }
  await loadQuotes();
  if (!ctx.alive()) return;

  // Arriving from a request: one line with the quoted price is a sensible start.
  if (!lines.length) {
    const q = quotes.find((x) => x.id === quoteId);
    lines = q?.offerAmount ? [{ description: `Quoted project ${q.ref}`, qty: '1', unitPrice: q.offerAmount }] : [{ description: '', qty: '1', unitPrice: '' }];
    if (q?.offerAmount && !existing && !ctx.query.get('currency')) currency = q.offerCurrency ?? q.currency;
  }

  const lineRow = (l: Line, i: number): string =>
    `<tr class="it"><td><input name="desc" value="${esc(l.description)}" placeholder="What is being billed" aria-label="Description ${i + 1}"></td><td><input name="qty" value="${esc(l.qty)}" inputmode="decimal" aria-label="Quantity ${i + 1}"></td><td><input name="price" value="${esc(l.unitPrice)}" inputmode="decimal" aria-label="Unit price ${i + 1}"></td><td class="num it-amt" data-amt></td><td><button class="iconbtn" type="button" data-del aria-label="Remove line ${i + 1}">×</button></td></tr>`;

  ctx.root.innerHTML =
    `<a class="back" href="#/finance/invoices">&larr; Invoices</a>` +
    pageHead(editing ? `Edit ${esc(existing?.number ?? '')}` : 'New invoice', 'Totals are worked out in whole cents. A sent invoice cannot be edited, only voided.') +
    `<form id="ivForm" class="pcard" novalidate><div class="pcard-b stack">
      <div class="f3">
        ${field('Client', `<select id="ivClient" name="clientId">${options(clients.map((c) => ({ value: c.id, label: `${c.fullName}${c.company ? ` · ${c.company}` : ''}` })), clientId)}</select>`, { id: 'ivClient' })}
        ${field('For request <span class="muted">(optional)</span>', '<select id="ivQuote" name="quoteId"></select>', { id: 'ivQuote' })}
        ${field('Currency', `<select id="ivCur" name="currency">${options(CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })), currency)}</select>`, { id: 'ivCur' })}
      </div>
      <div class="f3">
        ${field('Issue date <span class="muted">(blank = when sent)</span>', `<input id="ivIssue" name="issuedOn" type="date" value="${esc(existing?.issuedOn ?? '')}">`, { id: 'ivIssue' })}
        ${field('Due date', `<input id="ivDue" name="dueOn" type="date" value="${esc(existing?.dueOn ?? inDaysIso(14))}" required>`, { id: 'ivDue' })}
        ${field('Tax rate (%)', `<input id="ivTax" name="taxRate" inputmode="decimal" value="${esc(existing ? String(Number(existing.taxRate)) : '0')}">`, { id: 'ivTax' })}
      </div>
      <div class="tbl-wrap"><table class="tbl items-edit"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th class="num">Amount</th><th></th></tr></thead><tbody id="ivLines">${lines.map(lineRow).join('')}</tbody></table></div>
      <div><button class="btn btn-line btn-sm" type="button" id="addLine">Add a line</button></div>
      <dl class="totals" id="ivTotals"></dl>
      ${field('Notes <span class="muted">(shown on the invoice)</span>', `<textarea id="ivNotes" name="notes" rows="3" placeholder="Payment details, thank-you note…">${esc(existing?.notes ?? '')}</textarea>`, { id: 'ivNotes' })}
      <p class="form-err" id="ivErr" hidden></p>
      <div class="btn-row"><button class="btn btn-line" type="submit" data-then="draft">Save as draft</button><button class="btn btn-hi" type="submit" data-then="send">${editing ? 'Save and send' : 'Create and send'}</button></div>
    </div></form>`;

  const cur = (): CurrencyCode => ($<HTMLSelectElement>('#ivCur', ctx.root)?.value ?? 'USD') as CurrencyCode;
  const body = $<HTMLElement>('#ivLines', ctx.root)!;

  function readLines(): Line[] {
    return $$<HTMLElement>('tr.it', body).map((tr) => ({
      description: tr.querySelector<HTMLInputElement>('[name="desc"]')?.value.trim() ?? '',
      qty: tr.querySelector<HTMLInputElement>('[name="qty"]')?.value.replace(/,/g, '') ?? '',
      unitPrice: tr.querySelector<HTMLInputElement>('[name="price"]')?.value.replace(/,/g, '') ?? '',
    }));
  }

  function showTotals(): void {
    const rate = Number($<HTMLInputElement>('#ivTax', ctx.root)?.value.replace(/,/g, '')) || 0;
    const t = totals(readLines(), rate);
    $$<HTMLElement>('[data-amt]', body).forEach((c, i) => (c.textContent = formatMoney((t.amounts[i] ?? 0) / 100, cur())));
    $('#ivTotals', ctx.root)!.innerHTML = `<div><dt>Subtotal</dt><dd>${esc(formatMoney(t.subtotal / 100, cur()))}</dd></div>${t.tax ? `<div><dt>Tax (${rate}%)</dt><dd>${esc(formatMoney(t.tax / 100, cur()))}</dd></div>` : ''}<div class="grand"><dt>Total</dt><dd>${esc(formatMoney(t.total / 100, cur()))}</dd></div>`;
  }

  function fillQuotes(): void {
    $('#ivQuote', ctx.root)!.innerHTML = options([{ value: '', label: 'Not linked to a request' }, ...quotes.map((q) => ({ value: q.id, label: `${q.ref}${q.offerAmount ? ` · ${formatMoney(q.offerAmount, q.offerCurrency ?? q.currency)}` : ''}` }))], quoteId);
  }
  fillQuotes();
  showTotals();

  ctx.root.addEventListener('input', showTotals);
  $('#addLine', ctx.root)?.addEventListener('click', () => {
    body.insertAdjacentHTML('beforeend', lineRow({ description: '', qty: '1', unitPrice: '' }, body.children.length));
    body.querySelector<HTMLInputElement>('tr.it:last-child [name="desc"]')?.focus();
    showTotals();
  });
  body.addEventListener('click', (ev) => {
    const del = (ev.target as HTMLElement).closest('[data-del]');
    if (!del) return;
    if (body.children.length > 1) del.closest('tr')?.remove();
    showTotals();
  });
  $('#ivClient', ctx.root)?.addEventListener('change', async (ev) => {
    clientId = (ev.target as HTMLSelectElement).value;
    quoteId = '';
    const c = clients.find((x) => x.id === clientId);
    if (c) $<HTMLSelectElement>('#ivCur', ctx.root)!.value = c.currency;
    await loadQuotes();
    if (ctx.alive()) {
      fillQuotes();
      showTotals();
    }
  });
  $('#ivQuote', ctx.root)?.addEventListener('change', (ev) => {
    quoteId = (ev.target as HTMLSelectElement).value;
    const q = quotes.find((x) => x.id === quoteId);
    if (q?.offerAmount && readLines().every((l) => !l.description && !l.unitPrice)) {
      body.innerHTML = lineRow({ description: `Quoted project ${q.ref}`, qty: '1', unitPrice: q.offerAmount }, 0);
      $<HTMLSelectElement>('#ivCur', ctx.root)!.value = q.offerCurrency ?? q.currency;
      showTotals();
    }
  });

  const err = $<HTMLElement>('#ivErr', ctx.root)!;
  $<HTMLFormElement>('#ivForm', ctx.root)?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const then = (ev.submitter as HTMLElement | null)?.dataset['then'] ?? 'draft';
    err.hidden = true;
    const items = readLines().filter((l) => l.description || l.unitPrice);
    if (!items.length || items.some((l) => !l.description || !(Number(l.qty) > 0) || !(Number(l.unitPrice) >= 0) || l.unitPrice === '')) {
      err.textContent = 'Every line needs a description, a quantity above zero and a unit price.';
      err.hidden = false;
      return;
    }
    const f = new FormData(ev.currentTarget as HTMLFormElement);
    const payload = {
      clientId: String(f.get('clientId') ?? ''),
      quoteId: String(f.get('quoteId') ?? '') || null,
      currency: String(f.get('currency') ?? ''),
      items: items.map((l) => ({ description: l.description, qty: Number(l.qty), unitPrice: Number(l.unitPrice) })),
      taxRate: Number(String(f.get('taxRate') ?? '0').replace(/,/g, '')) || 0,
      issuedOn: String(f.get('issuedOn') ?? '') || undefined,
      dueOn: String(f.get('dueOn') ?? ''),
      notes: String(f.get('notes') ?? ''),
    };
    const buttons = $$<HTMLButtonElement>('button[type="submit"]', ctx.root);
    buttons.forEach((b) => (b.disabled = true));
    try {
      const saved = editing ? await api.put<{ invoice: Invoice }>(`/api/finance/invoices/${encodeURIComponent(editId)}`, payload) : await api.post<{ invoice: Invoice }>('/api/finance/invoices', payload);
      if (then === 'send') {
        await api.post(`/api/finance/invoices/${encodeURIComponent(saved.invoice.id)}/send`, {});
        toast(`${saved.invoice.number} sent to ${saved.invoice.client.fullName}`);
      } else toast(`${saved.invoice.number} saved as a draft`);
      ctx.go(`/finance/invoices/${encodeURIComponent(saved.invoice.id)}`);
    } catch (e) {
      err.textContent = e instanceof ApiRequestError ? (e.issues.length ? e.issues.map((i) => i.replace(/^[^:]+:\s*/, '')).join(' ') : e.message) : 'Something went wrong.';
      err.hidden = false;
      buttons.forEach((b) => (b.disabled = false));
    }
  });
};

export default view;
