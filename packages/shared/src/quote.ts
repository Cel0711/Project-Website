import type { PersonRef } from './auth.js';
import type { CurrencyCode } from './currency.js';
import type { ElementAdjustments, ElementProps, ElementStyle } from './element.js';
import type { CanvasTheme, DeviceKind } from './scene.js';

/** A trimmed-down, serialisable snapshot of one placed element for export. */
export interface DesignElementSnapshot {
  type: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  opacity: number;
  style: ElementStyle;
  adjust: ElementAdjustments;
  content: ElementProps;
}

/** The full studio design, attached to a quote request or downloaded as a file. */
export interface DesignPayload {
  device: DeviceKind;
  canvas: readonly [number, number];
  theme: CanvasTheme;
  count: number;
  elements: DesignElementSnapshot[];
}

/** What the quote form collects before it is turned into a request. */
export interface QuoteFormInput {
  name: string;
  company: string;
  email: string;
  phone: string;
  kinds: string[];
  planId: string | null;
  planName: string | null;
  budget: string;
  timeline: string;
  notes: string;
  attach: boolean;
}

/** The payload sent to the backend (POST /api/quotes) and written to the design file. */
export interface QuoteRequestPayload {
  name: string;
  company: string;
  email: string;
  phone: string;
  planId: string | null;
  planName: string | null;
  kinds: string[];
  budget: string;
  timeline: string;
  notes: string;
  /** The currency the client wants to be quoted in; defaults to their profile currency. */
  currency?: CurrencyCode;
  design: DesignPayload | null;
  /** ISO 8601, set by the client at submit time */
  sentAt: string;
}

/* ---------- request lifecycle ---------- */

export const QUOTE_STATUSES = ['submitted', 'reviewing', 'quoted', 'accepted', 'building', 'delivered', 'declined', 'cancelled'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  submitted: 'Request received',
  reviewing: 'In review',
  quoted: 'Quote ready',
  accepted: 'Quote approved',
  building: 'In build',
  delivered: 'Delivered',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

/** The progress stepper the client sees, in order. It follows the "How we work" stages on the landing page. */
export const QUOTE_STEPS: readonly { status: QuoteStatus; label: string; hint: string }[] = [
  { status: 'submitted', label: 'Request received', hint: 'We have your request and will read it shortly.' },
  { status: 'reviewing', label: 'Review and call', hint: 'We walk through the process with you and scope the work.' },
  { status: 'quoted', label: 'Quote ready', hint: 'Screens, a written scope and one fixed price are waiting for you.' },
  { status: 'accepted', label: 'Approved', hint: 'You approved the quote. We schedule the build.' },
  { status: 'building', label: 'In build', hint: 'Weekly releases on a staging link for you to try.' },
  { status: 'delivered', label: 'Delivered', hint: 'Source code, documentation and a training session handed over.' },
];

/** Moves the team may make. Clients approve, decline or cancel through their own actions. */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  submitted: ['reviewing', 'declined', 'cancelled'],
  reviewing: ['quoted', 'declined', 'cancelled'],
  quoted: ['reviewing', 'accepted', 'declined', 'cancelled'],
  accepted: ['building', 'cancelled'],
  building: ['delivered', 'cancelled'],
  delivered: [],
  declined: ['reviewing'],
  cancelled: ['reviewing'],
};

export interface QuoteOffer {
  amount: string;
  currency: CurrencyCode;
  summary: string;
  validUntil: string | null;
  sentAt: string;
}

export interface QuoteEvent {
  id: number;
  kind: 'status' | 'progress' | 'note' | 'offer' | 'system';
  fromStatus: QuoteStatus | null;
  toStatus: QuoteStatus | null;
  progress: number | null;
  body: string;
  visibleToClient: boolean;
  actor: PersonRef | null;
  createdAt: string;
}

/** One row in a list (no design, no events). */
export interface QuoteSummary {
  id: string;
  ref: string;
  status: QuoteStatus;
  progress: number;
  currency: CurrencyCode;
  planName: string | null;
  kinds: string[];
  hasDesign: boolean;
  elementCount: number;
  offerAmount: string | null;
  /** The currency of the quote, which can differ from the one the client asked to be quoted in. */
  offerCurrency: CurrencyCode | null;
  createdAt: string;
  updatedAt: string;
  /** Staff lists show who asked and who owns it. */
  client?: PersonRef;
  assignedTo?: PersonRef | null;
  conversationId?: string | null;
}

/** Everything about one request (what the detail screens load). */
export interface QuoteRecord extends QuoteSummary {
  planId: string | null;
  budget: string;
  timeline: string;
  notes: string;
  contact: { name: string; company: string; email: string; phone: string };
  design: DesignPayload | null;
  offer: QuoteOffer | null;
  events: QuoteEvent[];
}
