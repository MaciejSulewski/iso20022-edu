// Fails if content files disagree with the schema or with each other. Prints annotation coverage.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { parse as parseYaml } from "yaml";
import type { Schema } from "./schema-model.ts";
import {
  AnnotationSchema,
  MessageSchema,
  SampleSchema,
} from "../src/lib/content-schemas.ts";
import { resolvePath } from "../src/lib/resolver.ts";

type File = { name: string; data: unknown };
export type Input = {
  schema: Schema;
  messages: File[];
  annotations: File[];
  /** xml is undefined when the sample's file is missing. */
  samples: (File & { xml?: string | undefined })[];
};

// Tag paths of every element, no indexes, Document/ and message root stripped. Attributes are ignored by default.
function elementPaths(xml: string, root: string): Set<string> {
  const out = new Set<string>();
  const walk = (node: unknown, prefix: string) => {
    if (typeof node !== "object" || node === null) return;
    for (const [tag, v] of Object.entries(node)) {
      if (tag === "#text") continue;
      for (const child of Array.isArray(v) ? v : [v]) {
        out.add(`${prefix}${tag}`);
        walk(child, `${prefix}${tag}/`);
      }
    }
  };
  const doc = new XMLParser().parse(xml) as { Document?: unknown };
  walk((doc.Document as Record<string, unknown> | undefined)?.[root], "");
  return out;
}

export function checkContent({
  schema,
  messages,
  annotations,
  samples,
}: Input) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const parsed = <T>(
    f: File,
    s: {
      safeParse: (d: unknown) => {
        success: boolean;
        data?: T;
        error?: { message: string };
      };
    },
  ) => {
    const r = s.safeParse(f.data);
    if (!r.success) errors.push(`${f.name}: ${r.error?.message}`);
    return r.data;
  };
  const idMatches = (f: File, id: string) => {
    if (id !== f.name.replace(/\.yaml$/, ""))
      errors.push(`${f.name}: id "${id}" does not match the file name`);
  };

  for (const f of messages) {
    const m = parsed(f, MessageSchema);
    if (!m) continue;
    ids.add(m.id);
    idMatches(f, m.id);
  }

  const paths = new Set<string>();
  const annotatedPaths = new Set<string>();
  const annotatedTypes = new Set<string>();
  for (const f of annotations) {
    const a = parsed(f, AnnotationSchema);
    if (!a) continue;
    if (!ids.has(a.message))
      errors.push(
        `${f.name}: message "${a.message}" is not a known message id`,
      );
    if (a.message !== schema.id) continue; // shortcut: one schema only, extend when a second message arrives
    for (const k of Object.keys(a.byPath)) {
      const r = resolvePath(schema, k);
      if (r) annotatedPaths.add(r.path);
      else
        errors.push(
          `${f.name}: byPath "${k}" does not resolve in ${schema.id}`,
        );
    }
    for (const k of Object.keys(a.byType)) {
      if (schema.complexTypes[k]) annotatedTypes.add(k);
      else errors.push(`${f.name}: byType "${k}" is not a complex type`);
    }
    for (const [k, codes] of Object.entries(a.codes)) {
      const known = schema.simpleTypes[k]?.codes;
      if (!known) {
        errors.push(`${f.name}: codes "${k}" is not a simple type with codes`);
        continue;
      }
      const values = known.map((c) => (typeof c === "string" ? c : c.code));
      for (const c of Object.keys(codes))
        if (!values.includes(c))
          errors.push(`${f.name}: codes "${k}" has no code "${c}"`);
    }
  }

  for (const f of samples) {
    const s = parsed(f, SampleSchema);
    if (!s) continue;
    idMatches(f, s.id);
    if (!ids.has(s.message))
      errors.push(
        `${f.name}: message "${s.message}" is not a known message id`,
      );
    if (f.xml === undefined) {
      errors.push(`${f.name}: file "${s.file}" does not exist`);
      continue;
    }
    for (const p of elementPaths(f.xml, schema.root)) {
      if (resolvePath(schema, p)) paths.add(p);
      else
        errors.push(
          `${s.file}: element "${p}" does not resolve in ${schema.id}`,
        );
    }
  }

  const annotated = [...paths].filter((p) => {
    const r = resolvePath(schema, p);
    return r && (annotatedPaths.has(r.path) || annotatedTypes.has(r.typeName));
  }).length;
  return { errors, coverage: { annotated, total: paths.size } };
}

if (import.meta.main) {
  const dir = (d: string) => new URL(`../src/content/${d}/`, import.meta.url);
  const load = (d: string): File[] =>
    readdirSync(dir(d))
      .filter((n) => n.endsWith(".yaml"))
      .map((name) => ({
        name,
        data: parseYaml(readFileSync(new URL(name, dir(d)), "utf8")),
      }));
  const samples = load("samples").map((f) => {
    const file = (f.data as { file?: string }).file ?? "";
    const url = new URL(file, dir("samples"));
    return {
      ...f,
      xml: file && existsSync(url) ? readFileSync(url, "utf8") : undefined,
    };
  });
  const schema: Schema = JSON.parse(
    readFileSync(
      new URL("../src/data/schema/pacs.008.001.14.json", import.meta.url),
      "utf8",
    ),
  );
  const { errors, coverage } = checkContent({
    schema,
    messages: load("messages"),
    annotations: load("annotations"),
    samples,
  });
  console.log(
    `Coverage: ${coverage.annotated} of ${coverage.total} distinct sample element paths annotated`,
  );
  if (errors.length) {
    console.error(errors.map((e) => `ERROR ${e}`).join("\n"));
    process.exit(1);
  }
}
