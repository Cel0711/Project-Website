import { z } from 'zod';
import { CURRENCY_CODES, DEFAULT_CURRENCY } from './currency.js';
import { PAYMENT_METHODS } from './finance.js';
import { QUOTE_STATUSES } from './quote.js';
import { quoteRequestPayloadSchema } from './schema.js';

/**
 * Request-body validation for the portal API (accounts, requests, messages, invoices). The backend runs these
 * on every write, and the browser can reuse them to check a form before sending it.
 */

const emailSchema = z.string().trim().toLowerCase().email('A valid email is required').max(254);
const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username needs at least 3 characters')
  .max(40)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore');
const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-12-31');
/** Positive money amount, up to two decimals. */
const amountSchema = z.coerce.number().positive('Amount must be more than zero').max(999_999_999_999).transform((n) => Math.round(n * 100) / 100);

export const passwordSchema = z.string().min(10, 'Use at least 10 characters').max(128, 'Use at most 128 characters');
export const currencySchema = z.enum(CURRENCY_CODES);

/* ---------- accounts ---------- */

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Your name is required').max(120),
  email: emailSchema,
  password: passwordSchema,
  company: z.string().trim().max(200).default(''),
  phone: z.string().trim().max(60).default(''),
  currency: currencySchema.default(DEFAULT_CURRENCY),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username or email').max(254),
  password: z.string().min(1, 'Enter your password').max(128),
});

export const emailOnlySchema = z.object({ email: emailSchema });
export const tokenSchema = z.object({ token: z.string().min(20).max(200) });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    company: z.string().trim().max(200),
    phone: z.string().trim().max(60),
    currency: currencySchema,
    username: usernameSchema.nullable(),
  })
  .partial();

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
  email: emailSchema,
  role: z.enum(['admin', 'finance']),
  username: usernameSchema.optional(),
});

export const updateUserSchema = z
  .object({ role: z.enum(['admin', 'finance', 'client']), status: z.enum(['active', 'disabled']), fullName: z.string().trim().min(1).max(120) })
  .partial();

/* ---------- quote requests ---------- */

/** The quote form's payload; the server fills `sentAt` and falls back to the profile currency. */
export const submitQuoteSchema = quoteRequestPayloadSchema.extend({
  currency: currencySchema.optional(),
  sentAt: z.string().optional(),
});

export const staffUpdateQuoteSchema = z
  .object({
    status: z.enum(QUOTE_STATUSES),
    progress: z.number().int().min(0).max(100),
    assignedTo: idSchema.nullable(),
    note: z.string().trim().max(2000),
  })
  .partial();

export const addEventSchema = z.object({
  body: z.string().trim().min(1, 'Write a note first').max(4000),
  visibleToClient: z.boolean().default(false),
  progress: z.number().int().min(0).max(100).optional(),
});

export const offerSchema = z.object({
  amount: amountSchema,
  currency: currencySchema,
  summary: z.string().trim().min(1, 'Describe what the price covers').max(4000),
  validUntil: dateSchema.nullable().optional(),
});

export const clientQuoteActionSchema = z.object({ note: z.string().trim().max(2000).default('') });

/* ---------- messages ---------- */

export const messageSchema = z.object({ body: z.string().trim().min(1, 'Write a message first').max(5000) });
export const startConversationSchema = z.object({ clientId: idSchema });

/* ---------- finance ---------- */

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Describe the line').max(300),
  qty: z.coerce.number().positive().max(100_000),
  unitPrice: z.coerce.number().min(0).max(999_999_999),
});

export const invoiceSchema = z.object({
  clientId: idSchema,
  quoteId: idSchema.nullable().optional(),
  currency: currencySchema,
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line').max(100),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  issuedOn: dateSchema.optional(),
  dueOn: dateSchema,
  notes: z.string().trim().max(4000).default(''),
});

export const paymentSchema = z.object({
  amount: amountSchema,
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(120).default(''),
  paidOn: dateSchema.optional(),
  note: z.string().trim().max(1000).default(''),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type InvoiceInput = z.input<typeof invoiceSchema>;
export type PaymentInput = z.input<typeof paymentSchema>;
export type OfferInput = z.input<typeof offerSchema>;
