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
  design: DesignPayload | null;
  /** ISO 8601, set by the client at submit time */
  sentAt: string;
}

/** A stored quote, as returned by the backend. */
export interface QuoteRecord extends QuoteRequestPayload {
  id: string;
  /** ISO 8601, set by the backend on receipt */
  createdAt: string;
}

/** Lighter row shape for list views (the owner inbox), design omitted. */
export type QuoteSummary = Omit<QuoteRecord, 'design'> & { elementCount: number };
