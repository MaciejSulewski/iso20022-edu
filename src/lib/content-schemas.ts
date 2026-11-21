// Zod shapes for content files (Project Plan section 3). No Astro import, so tests and scripts can use it.
import { z } from "zod";

const Loc = z.strictObject({
  en: z.string().min(1),
  pl: z.string().min(1).optional(),
});
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const Overlay = z.strictObject({
  explanation: Loc,
  examples: z.array(z.string()).optional(),
  notes: Loc.optional(),
});

export const MessageSchema = z.strictObject({
  id: z.string(),
  family: z.string(),
  name: z.string(),
  purpose: z.string(),
  mtEquivalent: z.string().optional(),
  sources: z
    .array(z.strictObject({ title: z.string(), url: z.url(), retrieved: day }))
    .min(1),
  lastReviewed: z.strictObject({ date: day, by: z.string() }),
});

export const AnnotationSchema = z.strictObject({
  message: z.string(),
  byPath: z.record(z.string(), Overlay),
  byType: z.record(z.string(), Overlay).default({}),
  codes: z.record(z.string(), z.record(z.string(), Loc)).default({}),
});

export const SampleSchema = z.strictObject({
  id: z.string(),
  message: z.string(),
  file: z.string(),
  title: z.string(),
  scenario: z.string(),
});
