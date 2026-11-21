import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  AnnotationSchema,
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
  samples: defineCollection({
    loader: yaml("src/content/samples"),
    schema: SampleSchema,
  }),
};
