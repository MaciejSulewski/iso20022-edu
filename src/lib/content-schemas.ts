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
  order: z.number().int(),
});

/** The "Start here" steps in order; one lesson per step. */
export const STEPS = [
  "lesson",
  "xml",
  "tree",
  "flow",
  "mapping",
  "quiz",
] as const;

const Sources = z
  .array(
    z.strictObject({
      title: z.string(),
      url: z.url({ protocol: /^https$/ }),
      retrieved: day,
    }),
  )
  .min(1);
const Reviewed = z.strictObject({ date: day, by: z.string() });

export const LessonSchema = z.strictObject({
  title: z.string().min(1),
  summary: z.string().min(1),
  step: z.enum(STEPS),
  order: z.number().int().min(1).max(STEPS.length),
  relatedElements: z.array(z.string()).default([]),
  sources: Sources,
  lastReviewed: Reviewed,
});

const FlowStep = z.strictObject({
  from: z.string().min(1),
  to: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  message: z.string().optional(),
  elements: z.array(z.string()).default([]),
  settlement: z.string().optional(),
});

export const FlowSchema = z.strictObject({
  id: z.string().min(1),
  message: z.string(),
  title: z.string().min(1),
  summary: z.string().min(1),
  lesson: z.string(),
  sample: z.string(),
  sources: Sources,
  lastReviewed: Reviewed,
  participants: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        role: z.string().min(1),
        who: z.string().min(1),
      }),
    )
    .min(2),
  variants: z
    .array(
      z.strictObject({
        id: z.enum(["serial", "cover"]),
        title: z.string().min(1),
        intro: z.string().min(1),
        notice: z.string().optional(),
        steps: z.array(FlowStep).min(2),
      }),
    )
    .min(1),
});
