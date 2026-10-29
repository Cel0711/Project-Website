import type { MailMessage } from './mailer.js';

type Body = Omit<MailMessage, 'to'>;

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

interface Layout {
  company: string;
  heading: string;
  lines: string[];
  cta?: { label: string; url: string };
  footer?: string;
}

/** One plain, readable layout for every email: heading, short paragraphs, one button, a footer line. */
function layout(l: Layout): Pick<Body, 'text' | 'html'> {
  const text = [l.heading, '', ...l.lines, ...(l.cta ? ['', `${l.cta.label}: ${l.cta.url}`] : []), '', l.footer ?? `— ${l.company}`].join('\n');
  const html =
    `<div style="font-family:Archivo,Helvetica,Arial,sans-serif;background:#F3F4F6;padding:24px">` +
    `<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #D8DBE0;border-radius:10px;padding:28px;color:#1B2128">` +
    `<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#505A64;margin-bottom:14px">${esc(l.company)}</div>` +
    `<h1 style="font-size:20px;line-height:1.3;margin:0 0 14px">${esc(l.heading)}</h1>` +
    l.lines.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;color:#505A64">${esc(p)}</p>`).join('') +
    (l.cta
      ? `<p style="margin:20px 0 6px"><a href="${esc(l.cta.url)}" style="display:inline-block;background:#FFC41F;color:#1B2128;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:6px">${esc(l.cta.label)}</a></p>` +
        `<p style="font-size:12px;color:#818A94;word-break:break-all;margin:8px 0 0">${esc(l.cta.url)}</p>`
      : '') +
    `<p style="font-size:12px;color:#818A94;margin:22px 0 0">${esc(l.footer ?? `Sent by ${l.company}`)}</p>` +
    `</div></div>`;
  return { text, html };
}

export function verifyEmail(a: { company: string; name: string; url: string }): Body {
  return { subject: `Confirm your email for ${a.company}`, ...layout({ company: a.company, heading: `Welcome, ${a.name}`, lines: ['Confirm your email address to start sending quote requests. The link works for 48 hours.'], cta: { label: 'Confirm email', url: a.url } }) };
}

export function resetPassword(a: { company: string; name: string; url: string }): Body {
  return { subject: `Reset your ${a.company} password`, ...layout({ company: a.company, heading: 'Choose a new password', lines: [`Hi ${a.name}, we received a request to reset your password. The link works for one hour.`, 'If it was not you, ignore this email and your password stays as it is.'], cta: { label: 'Choose a new password', url: a.url } }) };
}

export function invite(a: { company: string; name: string; role: string; url: string }): Body {
  return { subject: `You have been invited to ${a.company}`, ...layout({ company: a.company, heading: `Hi ${a.name}, your ${a.role} account is ready`, lines: ['Set your password to sign in. The link works for 7 days.'], cta: { label: 'Set my password', url: a.url } }) };
}

export function usernameReminder(a: { company: string; name: string; username: string | null; email: string; url: string }): Body {
  const how = a.username ? `Your username is "${a.username}". You can also sign in with ${a.email}.` : `You sign in with your email address, ${a.email}.`;
  return { subject: `Your ${a.company} sign-in details`, ...layout({ company: a.company, heading: `Hi ${a.name}`, lines: [how], cta: { label: 'Sign in', url: a.url } }) };
}

export function newMessage(a: { company: string; name: string; from: string; preview: string; url: string }): Body {
  return { subject: `New message from ${a.from}`, ...layout({ company: a.company, heading: `Hi ${a.name}, you have a new message`, lines: [`${a.from}: "${a.preview}"`], cta: { label: 'Open the conversation', url: a.url } }) };
}

export function quoteReceived(a: { company: string; name: string; ref: string; url: string }): Body {
  return { subject: `We received your request ${a.ref}`, ...layout({ company: a.company, heading: 'Request received', lines: [`Hi ${a.name}, thank you. Your request ${a.ref} is in our queue. We reply within one business day, and you can follow every step in your dashboard.`], cta: { label: 'Track progress', url: a.url } }) };
}

export function newQuoteForStaff(a: { company: string; ref: string; client: string; kinds: string; url: string }): Body {
  return { subject: `New quote request ${a.ref} from ${a.client}`, ...layout({ company: a.company, heading: `New request ${a.ref}`, lines: [`${a.client} asked for: ${a.kinds || 'not specified'}.`], cta: { label: 'Open the request', url: a.url } }) };
}

export function quoteUpdate(a: { company: string; name: string; ref: string; status: string; note: string; url: string }): Body {
  return { subject: `${a.ref}: ${a.status}`, ...layout({ company: a.company, heading: `${a.ref} is now "${a.status}"`, lines: [`Hi ${a.name},`, ...(a.note ? [a.note] : ['Open your dashboard to see the details.'])], cta: { label: 'See progress', url: a.url } }) };
}

export function quoteOffer(a: { company: string; name: string; ref: string; amount: string; url: string }): Body {
  return { subject: `Your quote for ${a.ref} is ready`, ...layout({ company: a.company, heading: `Your quote is ready: ${a.amount}`, lines: [`Hi ${a.name}, we prepared a fixed-price quote for ${a.ref}. Review the scope and approve it, or ask us a question, from your dashboard.`], cta: { label: 'Review the quote', url: a.url } }) };
}

export function clientDecision(a: { company: string; ref: string; client: string; decision: string; note: string; url: string }): Body {
  return { subject: `${a.client} ${a.decision} ${a.ref}`, ...layout({ company: a.company, heading: `${a.ref} was ${a.decision}`, lines: [`${a.client} ${a.decision} the quote.`, ...(a.note ? [`Note: ${a.note}`] : [])], cta: { label: 'Open the request', url: a.url } }) };
}

export function invoiceSent(a: { company: string; name: string; number: string; total: string; due: string; url: string }): Body {
  return { subject: `Invoice ${a.number} from ${a.company}`, ...layout({ company: a.company, heading: `Invoice ${a.number}: ${a.total}`, lines: [`Hi ${a.name}, a new invoice is ready. It is due on ${a.due}.`], cta: { label: 'View the invoice', url: a.url } }) };
}

export function paymentReminder(a: { company: string; name: string; number: string; balance: string; due: string; url: string }): Body {
  return { subject: `Reminder: invoice ${a.number}`, ...layout({ company: a.company, heading: `Invoice ${a.number} has ${a.balance} outstanding`, lines: [`Hi ${a.name}, this is a friendly reminder that the invoice was due on ${a.due}. If you already paid, thank you, and please ignore this.`], cta: { label: 'View the invoice', url: a.url } }) };
}

export function paymentReceived(a: { company: string; name: string; number: string; amount: string; balance: string; url: string }): Body {
  return { subject: `Payment received for ${a.number}`, ...layout({ company: a.company, heading: `We received ${a.amount}`, lines: [`Hi ${a.name}, thank you. Invoice ${a.number} now has ${a.balance} outstanding.`], cta: { label: 'View the invoice', url: a.url } }) };
}
