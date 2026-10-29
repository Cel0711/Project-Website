import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type Invoice, type PaymentMethod } from '@coreloop/shared';
import { api } from '../../api/client.js';
import { CFG } from '../../config.js';
import { esc, toast } from '../../core/dom.js';
import { confirmDialog, openDialog } from '../dialog.js';
import type { View } from '../routes.js';
import { card, fmtDate, invoiceBadge, money, options, todayIso } from '../ui.js';

/**
 * One invoice as a document. Clients read it and print it; Finance and Admin also send it,
 * record payments, remind, void or edit it.
 */
const view: View = async (ctx) => {
  const staff = ctx.user.role !== 'client';
  const id = ctx.params['id'] ?? '';
  const base = staff ? `/api/finance/invoices/${encodeURIComponent(id)}` : `/api/invoices/${encodeURIComponent(id)}`;
  const listPath = staff ? '/finance/invoices' : '/invoices';
  let inv = (await api.get<{ invoice: Invoice }>(base)).invoice;
  if (!ctx.alive()) return;
  ctx.setTitle(inv.number);

  const cur = (): string => inv.currency;

  function actions(): string {
    const print = '<button class="btn btn-line btn-sm" type="button" data-act="print">Print / save as PDF</button>';
    if (!staff) return `${print}<a class="btn btn-line btn-sm" href="#/messages">Ask about this invoice</a>`;
    const open = inv.status === 'sent' && Number(inv.balance) > 0;
    return (
      (inv.status === 'draft' ? `<button class="btn btn-hi btn-sm" type="button" data-act="send">Send to client</button><a class="btn btn-line btn-sm" href="#/finance/invoices/${encodeURIComponent(inv.id)}/edit">Edit</a><button class="btn btn-line btn-sm" type="button" data-act="delete">Delete draft</button>` : '') +
      (open ? `<button class="btn btn-hi btn-sm" type="button" data-act="pay">Record payment</button><button class="btn btn-line btn-sm" type="button" data-act="remind">Send reminder</button>` : '') +
      (inv.status === 'sent' && Number(inv.paid) === 0 ? '<button class="btn btn-line btn-sm" type="button" data-act="void">Void</button>' : '') +
      print
    );
  }

  function paint(): void {
    ctx.root.innerHTML =
      `<a class="back no-print" href="#${listPath}">&larr; Invoices</a>
       <div class="ph no-print"><div><h1 class="ph-t" tabindex="-1">${esc(inv.number)} ${invoiceBadge(inv.displayStatus)}</h1><p class="ph-s">${esc(inv.client.fullName)} · due ${esc(fmtDate(inv.dueOn))}</p></div><div class="ph-act">${actions()}</div></div>
       <article class="sheet">
         <div class="sheet-top"><div><b class="sheet-co">${esc(CFG.company)}</b><p>${esc(CFG.email)}</p></div><div class="sheet-no"><span class="fld">Invoice</span><b>${esc(inv.number)}</b>${inv.status === 'void' ? '<span class="badge b-neutral">VOID</span>' : ''}</div></div>
         <div class="sheet-grid">
           <div><span class="fld">Bill to</span><b>${esc(inv.client.fullName)}</b><p>${esc(inv.client.company ?? '')}${inv.client.company ? '<br>' : ''}${esc(inv.client.email ?? '')}</p></div>
           <dl class="dl dl-tight"><div><dt>Issued</dt><dd>${esc(fmtDate(inv.issuedOn))}</dd></div><div><dt>Due</dt><dd>${esc(fmtDate(inv.dueOn))}</dd></div><div><dt>Currency</dt><dd>${esc(inv.currency)}</dd></div>${inv.quoteRef ? `<div><dt>Request</dt><dd>${esc(inv.quoteRef)}</dd></div>` : ''}</dl>
         </div>
         <table class="tbl items"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${inv.items.map((i) => `<tr><td>${esc(i.description)}</td><td class="num">${esc(i.qty)}</td><td class="num">${esc(money(i.unitPrice, cur()))}</td><td class="num">${esc(money(i.amount, cur()))}</td></tr>`).join('')}</tbody></table>
         <dl class="totals">
           <div><dt>Subtotal</dt><dd>${esc(money(inv.subtotal, cur()))}</dd></div>
           ${Number(inv.tax) > 0 ? `<div><dt>Tax (${esc(String(Number(inv.taxRate)))}%)</dt><dd>${esc(money(inv.tax, cur()))}</dd></div>` : ''}
           <div class="grand"><dt>Total</dt><dd>${esc(money(inv.total, cur()))}</dd></div>
           <div><dt>Paid</dt><dd>${esc(money(inv.paid, cur()))}</dd></div>
           <div class="due"><dt>Balance due</dt><dd>${esc(money(inv.balance, cur()))}</dd></div>
         </dl>
         ${inv.notes ? `<p class="sheet-notes"><span class="fld">Notes</span>${esc(inv.notes)}</p>` : ''}
       </article>
       ${inv.payments.length ? card('Payments', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="num">Amount</th>${staff ? '<th class="hide-s">Recorded by</th>' : ''}</tr></thead><tbody>${inv.payments.map((p) => `<tr><td>${esc(fmtDate(p.paidOn))}</td><td>${esc(PAYMENT_METHOD_LABEL[p.method])}</td><td>${esc(p.reference || '—')}</td><td class="num">${esc(money(p.amount, cur()))}</td>${staff ? `<td class="hide-s">${esc(p.recordedBy?.fullName ?? '—')}</td>` : ''}</tr>`).join('')}</tbody></table></div>`, '', 'flush no-print') : ''}`;
  }

  async function reload(): Promise<void> {
    inv = (await api.get<{ invoice: Invoice }>(base)).invoice;
    if (ctx.alive()) paint();
  }

  async function post(path: string, body: unknown = {}): Promise<void> {
    inv = (await api.post<{ invoice: Invoice }>(`${base}${path}`, body)).invoice;
    paint();
  }

  paint();
  ctx.root.addEventListener('click', async (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b) return;
    const act = b.dataset['act'];
    try {
      if (act === 'print') window.print();
      else if (act === 'send') {
        if (await confirmDialog('Send this invoice?', `${esc(inv.client.fullName)} will see it in their dashboard and get an email.`, 'Send invoice')) {
          await post('/send');
          toast('Invoice sent');
        }
      } else if (act === 'delete') {
        if (await confirmDialog('Delete this draft?', 'It has not been sent, so nothing is lost for the client.', 'Delete draft', true)) {
          await api.del(base);
          toast('Draft deleted');
          ctx.go(listPath);
        }
      } else if (act === 'void') {
        if (await confirmDialog('Void this invoice?', 'It stays on record but can no longer be paid. Use this when it was issued by mistake.', 'Void invoice', true)) {
          await post('/void');
          toast('Invoice voided');
        }
      } else if (act === 'remind') {
        if (await confirmDialog('Send a payment reminder?', `${esc(inv.client.fullName)} gets a message in their chat and an email about ${esc(money(inv.balance, cur()))}.`, 'Send reminder')) {
          await api.post(`${base}/remind`, {});
          toast('Reminder sent');
        }
      } else if (act === 'pay') {
        openDialog({
          title: 'Record a payment',
          body:
            `<p class="dlg-msg">${esc(money(inv.balance, cur()))} is still owed on ${esc(inv.number)}.</p>` +
            `<div class="f2"><div class="fi"><label for="pyAmt">Amount (${esc(cur())})</label><input id="pyAmt" name="amount" inputmode="decimal" value="${esc(inv.balance)}" required></div>` +
            `<div class="fi"><label for="pyDate">Date received</label><input id="pyDate" name="paidOn" type="date" value="${todayIso()}" required></div></div>` +
            `<div class="f2"><div class="fi"><label for="pyMethod">Method</label><select id="pyMethod" name="method">${options(PAYMENT_METHODS.map((m: PaymentMethod) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] })), 'bank_transfer')}</select></div>` +
            `<div class="fi"><label for="pyRef">Reference</label><input id="pyRef" name="reference" placeholder="Bank reference, receipt no."></div></div>` +
            `<div class="fi"><label for="pyNote">Note (optional)</label><input id="pyNote" name="note"></div>`,
          submit: 'Record payment',
          onSubmit: async (d) => {
            await post('/payments', { amount: Number(d['amount']), method: d['method'], reference: d['reference'] ?? '', paidOn: d['paidOn'], note: d['note'] ?? '' });
            toast('Payment recorded');
          },
        });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong.');
    }
  });

  ctx.onLive((m) => {
    if ((m.type === 'invoice' && m.id === inv.id) || m.type === 'resync') void reload();
  });
};

export default view;
