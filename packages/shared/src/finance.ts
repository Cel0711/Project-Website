import type { PersonRef } from './auth.js';
import type { CurrencyCode } from './currency.js';

/** Stored status. "paid", "partial" and "overdue" are derived from payments and the due date. */
export type InvoiceStatus = 'draft' | 'sent' | 'void';
export type InvoiceDisplayStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';

export const PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque', 'card', 'e_wallet', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  card: 'Card',
  e_wallet: 'E-wallet',
  other: 'Other',
};

export interface InvoiceItem {
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
}

export interface Payment {
  id: number;
  invoiceId: string;
  amount: string;
  method: PaymentMethod;
  reference: string;
  paidOn: string;
  note: string;
  recordedBy: PersonRef | null;
  createdAt: string;
}

/** Amounts are strings with two decimals so nothing is lost to floating point. */
export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  displayStatus: InvoiceDisplayStatus;
  currency: CurrencyCode;
  client: PersonRef;
  quoteId: string | null;
  quoteRef: string | null;
  items: InvoiceItem[];
  subtotal: string;
  taxRate: string;
  tax: string;
  total: string;
  paid: string;
  balance: string;
  issuedOn: string | null;
  dueOn: string;
  notes: string;
  createdAt: string;
  sentAt: string | null;
  payments: Payment[];
}

export type InvoiceSummary = Omit<Invoice, 'items' | 'payments'>;

export const AGING_BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export interface FinanceSummary {
  currency: CurrencyCode;
  /** Currencies that have any invoice, so the dashboard can offer a tab for each. */
  currencies: CurrencyCode[];
  kpis: {
    invoicedThisMonth: string;
    collectedThisMonth: string;
    outstanding: string;
    overdueAmount: string;
    overdueCount: number;
    avgDaysToPay: number | null;
  };
  /** Oldest first, always 12 entries ending with the current month ("2026-10"). */
  monthly: { month: string; invoiced: string; collected: string }[];
  aging: { bucket: AgingBucket; amount: string; count: number }[];
  topClients: { client: PersonRef; invoiced: string; paid: string }[];
  attention: {
    overdue: InvoiceSummary[];
    dueSoon: InvoiceSummary[];
    acceptedWithoutInvoice: { id: string; ref: string; client: PersonRef; amount: string | null; currency: CurrencyCode }[];
  };
}
