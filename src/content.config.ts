import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  AnnotationSchema,
  FlowSchema,
  LessonSchema,
  MappingSchema,
  MessageSchema,
  SampleSchema,
} from "./lib/content-schemas.ts";

const yaml = (base: string) =>
  glob({
    pattern: "*.yaml",
    base,
    generateId: ({ entry }) => entry.replace(/\.yaml$/, ""),
  });

export const collections = {
  messages: defineCollection({
    loader: yaml("src/content/messages"),
    schema: MessageSchema,
  }),
  annotations: defineCollection({
    loader: yaml("src/content/annotations"),
    schema: AnnotationSchema,
  }),
  lessons: defineCollection({
    loader: glob({
      pattern: "*.md",
      base: "src/content/lessons/en",
      generateId: ({ entry }) => entry.replace(/\.md$/, ""),
    }),
    schema: LessonSchema,
  }),
  flows: defineCollection({
    loader: yaml("src/content/flows"),
    schema: FlowSchema,
  }),
  mappings: defineCollection({
    loader: yaml("src/content/mappings"),
    schema: MappingSchema,
  }),
  samples: defineCollection({
    loader: yaml("src/content/samples"),
    schema: SampleSchema,
  }),
};
