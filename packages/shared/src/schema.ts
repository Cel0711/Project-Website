import { z } from 'zod';

/**
 * Runtime validation for what crosses the network boundary. Kept looser than
 * the full ElementInstance type (design content is per-renderer free-form
 * props) — the backend's job is to sanity-check shape and size, not to
 * re-validate every renderer's own field rules; that already happened in
 * the studio inspector.
 */

export const elementStyleSchema = z.object({
  fill: z.string(),
  fill2: z.string(),
  grad: z.union([z.literal(0), z.literal(1)]),
  gdir: z.number(),
  radius: z.number(),
  bw: z.number(),
  bc: z.string(),
  shadow: z.enum(['none', 'sm', 'md', 'lg', 'inner']),
  pad: z.number(),
});

export const elementAdjustmentsSchema = z.object({
  br: z.number(),
  ct: z.number(),
  sa: z.number(),
  bl: z.number(),
  hu: z.number(),
});

export const designElementSnapshotSchema = z.object({
  type: z.string().min(1),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rot: z.number(),
  opacity: z.number(),
  style: elementStyleSchema,
  adjust: elementAdjustmentsSchema,
  content: z.record(z.string(), z.unknown()),
});

export const designPayloadSchema = z.object({
  device: z.enum(['desktop', 'tablet', 'phone']),
  canvas: z.tuple([z.number(), z.number()]),
  theme: z.enum(['light', 'dark']),
  count: z.number().int().min(0),
  // Cap element count defensively; the studio itself has no hard limit, but
  // an unbounded array is the one thing worth guarding at the API boundary.
  elements: z.array(designElementSnapshotSchema).max(2000),
});

export const quoteRequestPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  company: z.string().trim().max(200).default(''),
  email: z.string().trim().email('A valid email is required'),
  phone: z.string().trim().max(60).default(''),
  planId: z.string().nullable().default(null),
  planName: z.string().nullable().default(null),
  kinds: z.array(z.string()).default([]),
  budget: z.string().default(''),
  timeline: z.string().default(''),
  notes: z.string().max(20000).default(''),
  design: designPayloadSchema.nullable(),
  sentAt: z.string(),
});

export type QuoteRequestPayloadInput = z.input<typeof quoteRequestPayloadSchema>;
export type QuoteRequestPayloadParsed = z.output<typeof quoteRequestPayloadSchema>;
