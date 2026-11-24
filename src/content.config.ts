import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  AnnotationSchema,
  ChangelogSchema,
  FlowSchema,
  GlossarySchema,
  LessonSchema,
  MappingSchema,
  MessageSchema,
  QuizSchema,
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
  glossary: defineCollection({
    loader: yaml("src/content/glossary"),
    schema: GlossarySchema,
  }),
  quizzes: defineCollection({
    loader: yaml("src/content/quizzes"),
    schema: QuizSchema,
  }),
  changelog: defineCollection({
    loader: yaml("src/content/changelog"),
    schema: ChangelogSchema,
  }),
  samples: defineCollection({
    loader: yaml("src/content/samples"),
    schema: SampleSchema,
  }),
};
