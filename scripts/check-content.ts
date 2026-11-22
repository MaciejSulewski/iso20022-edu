// Fails if content files disagree with the schema or with each other. Prints annotation coverage.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { Schema } from "./schema-model.ts";
import {
  AnnotationSchema,
  FlowSchema,
  LessonSchema,
  MappingSchema,
  MessageSchema,
  SampleSchema,
  STEPS,
} from "../src/lib/content-schemas.ts";
import { resolvePath } from "../src/lib/resolver.ts";
import { elementPaths, parseXml } from "../src/lib/xml-tree.ts";

type File = { name: string; data: unknown };
export type Input = {
  schema: Schema;
  messages: File[];
  annotations: File[];
  /** xml is undefined when the sample's file is missing. */
  samples: (File & { xml?: string | undefined })[];
  /** name is the file name, data the front matter. */
  lessons?: File[];
  flows?: File[];
  mappings?: File[];
  /** Turn "a step has no lesson" from a report into an error (on once all six lessons exist). */
  requireAllSteps?: boolean;
};

export function checkContent({
  schema,
  messages,
  annotations,
  samples,
  lessons = [],
  flows = [],
  mappings = [],
  requireAllSteps = false,
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
    if (a.message !== schema.id) {
      // shortcut: one schema loaded, extend when a second message arrives
      if (ids.has(a.message))
        errors.push(`${f.name}: no schema for message "${a.message}"`);
      continue;
    }
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

  const orders = new Set<string>();
  const sampleMessage = new Map<string, string>();
  for (const f of samples) {
    const s = parsed(f, SampleSchema);
    if (!s) continue;
    const key = `${s.message}#${s.order}`;
    if (orders.has(key))
      errors.push(
        `${f.name}: another sample of ${s.message} has the same order ${s.order}`,
      );
    orders.add(key);
    idMatches(f, s.id);
    sampleMessage.set(s.id, s.message);
    if (!ids.has(s.message))
      errors.push(
        `${f.name}: message "${s.message}" is not a known message id`,
      );
    else if (s.message !== schema.id) {
      errors.push(`${f.name}: no schema for message "${s.message}"`);
      continue;
    }
    if (f.xml === undefined) {
      errors.push(`${f.name}: file "${s.file}" does not exist`);
      continue;
    }
    const raw = parseXml(f.xml, schema.root);
    if (!raw) {
      errors.push(`${s.file}: expected root Document/${schema.root}`);
      continue;
    }
    for (const p of new Set(elementPaths(raw))) {
      if (resolvePath(schema, p)) paths.add(p);
      else
        errors.push(
          `${s.file}: element "${p}" does not resolve in ${schema.id}`,
        );
    }
  }

  const byStep = new Map<string, string>();
  const byOrder = new Map<number, string>();
  for (const f of lessons) {
    const l = parsed(f, LessonSchema);
    if (!l) continue;
    const used = byStep.get(l.step);
    if (used)
      errors.push(`${f.name}: step "${l.step}" is already used by ${used}`);
    else byStep.set(l.step, f.name);
    const usedOrder = byOrder.get(l.order);
    if (usedOrder)
      errors.push(
        `${f.name}: order ${l.order} is already used by ${usedOrder}`,
      );
    else byOrder.set(l.order, f.name);
    const pos = STEPS.indexOf(l.step) + 1;
    if (l.order !== pos)
      errors.push(
        `${f.name}: order ${l.order} does not match: step "${l.step}" is position ${pos}`,
      );
    for (const p of l.relatedElements)
      if (!resolvePath(schema, p))
        errors.push(
          `${f.name}: relatedElements "${p}" does not resolve in ${schema.id}`,
        );
  }
  const missingSteps = STEPS.filter((s) => !byStep.has(s));
  if (requireAllSteps)
    for (const s of missingSteps) errors.push(`step "${s}" has no lesson`);

  const lessonIds = new Set(lessons.map((l) => l.name.replace(/\.md$/, "")));
  const settlementCodes = (
    schema.simpleTypes["SettlementMethod1Code"]?.codes ?? []
  ).map((c) => (typeof c === "string" ? c : c.code));
  for (const f of flows) {
    const fl = parsed(f, FlowSchema);
    if (!fl) continue;
    idMatches(f, fl.id);
    if (fl.message !== schema.id) {
      errors.push(`${f.name}: no schema for message "${fl.message}"`);
      continue;
    }
    if (!lessonIds.has(fl.lesson))
      errors.push(`${f.name}: lesson "${fl.lesson}" is not a lesson id`);
    if (fl.sample && sampleMessage.get(fl.sample) !== fl.message)
      errors.push(
        `${f.name}: sample "${fl.sample}" is not a sample of ${fl.message}`,
      );
    const flagged = fl.variants.flatMap((v) => v.steps).filter((s) => s.sample);
    if (fl.sample && flagged.length !== 1)
      errors.push(
        `${f.name}: sample "${fl.sample}" needs exactly one step with sample: true, found ${flagged.length}`,
      );
    if (!fl.sample && flagged.length)
      errors.push(
        `${f.name}: a step sets sample: true but the flow has no sample`,
      );
    const people = new Set<string>();
    for (const p of fl.participants) {
      if (people.has(p.id))
        errors.push(`${f.name}: participant id "${p.id}" is used twice`);
      people.add(p.id);
    }
    const seen = new Set<string>();
    for (const v of fl.variants) {
      if (seen.has(v.id))
        errors.push(`${f.name}: variant id "${v.id}" is used twice`);
      seen.add(v.id);
      const used = new Set<string>();
      v.steps.forEach((st, n) => {
        for (const end of ["from", "to"] as const) {
          if (people.has(st[end])) used.add(st[end]);
          else
            errors.push(
              `${f.name}: step ${n + 1} "${end}" "${st[end]}" is not a participant`,
            );
        }
        for (const p of st.elements)
          if (!resolvePath(schema, p))
            errors.push(
              `${f.name}: element "${p}" does not resolve in ${schema.id}`,
            );
        if (st.settlement && !settlementCodes.includes(st.settlement))
          errors.push(
            `${f.name}: settlement "${st.settlement}" is not a code of SettlementMethod1Code`,
          );
      });
      for (const p of people)
        if (!used.has(p))
          errors.push(
            `${f.name}: variant "${v.id}": participant "${p}" is in no step`,
          );
    }
  }

  for (const f of mappings) {
    const m = parsed(f, MappingSchema);
    if (!m) continue;
    idMatches(f, m.id);
    if (m.message !== schema.id) {
      errors.push(`${f.name}: no schema for message "${m.message}"`);
      continue;
    }
    if (!lessonIds.has(m.lesson))
      errors.push(`${f.name}: lesson "${m.lesson}" is not a lesson id`);
    const seenPaths = new Set<string>();
    const seenFields = new Set<string>();
    const used = new Set<number>();
    const entries = [
      ...m.rows.map((r) => ({ ...r, where: `row "${r.field}"` })),
      ...m.additions.map((a, n) => ({ ...a, where: `addition ${n + 1}` })),
    ];
    for (const e of entries) {
      for (const p of e.paths) {
        if (!resolvePath(schema, p))
          errors.push(
            `${f.name}: ${e.where}: path "${p}" does not resolve in ${schema.id}`,
          );
        const key = resolvePath(schema, p)?.path ?? p;
        if (seenPaths.has(key))
          errors.push(`${f.name}: path "${p}" appears twice`);
        seenPaths.add(key);
      }
      for (const s of e.sources) {
        if (s >= m.sources.length)
          errors.push(
            `${f.name}: ${e.where}: source ${s} is not in the sources list`,
          );
        used.add(s);
      }
      if (!("field" in e)) continue;
      if (seenFields.has(e.field))
        errors.push(`${f.name}: field "${e.field}" appears twice`);
      seenFields.add(e.field);
      if (!e.codes && !e.codeList) continue;
      const known = e.codeList ? schema.simpleTypes[e.codeList]?.codes : null;
      if (!known) {
        errors.push(
          `${f.name}: ${e.where}: codeList "${e.codeList ?? ""}" is not a simple type with codes`,
        );
        continue;
      }
      const values = known.map((c) => (typeof c === "string" ? c : c.code));
      for (const c of e.codes ?? [])
        if (!values.includes(c.iso))
          errors.push(
            `${f.name}: ${e.where}: "${c.iso}" is not a code of ${e.codeList}`,
          );
    }
    m.sources.forEach((s, n) => {
      if (!used.has(n))
        errors.push(
          `${f.name}: source ${n} "${s.title}" is used by no row or addition`,
        );
    });
  }

  const annotated = [...paths].filter((p) => {
    const r = resolvePath(schema, p);
    return r && (annotatedPaths.has(r.path) || annotatedTypes.has(r.typeName));
  }).length;
  return {
    errors,
    coverage: { annotated, total: paths.size },
    lessons: { count: byStep.size, missingSteps },
    flows: flows.length,
    mappings: mappings.length,
  };
}

/** Complex types that two or more elements use, and how many of them have a byType entry. */
export function sharedTypes(schema: Schema, byType: Set<string>) {
  const uses = new Map<string, number>();
  for (const t of Object.values(schema.complexTypes))
    for (const e of t.elements)
      if ("type" in e && schema.complexTypes[e.type])
        uses.set(e.type, (uses.get(e.type) ?? 0) + 1);
  const shared = [...uses].filter(([, n]) => n >= 2).map(([k]) => k);
  return {
    overlaid: shared.filter((k) => byType.has(k)).length,
    total: shared.length,
  };
}

if (import.meta.main) {
  const dir = (d: string) => new URL(`../src/content/${d}/`, import.meta.url);
  const loadErrors: string[] = [];
  const load = (d: string): File[] =>
    readdirSync(dir(d))
      .filter((n) => n.endsWith(".yaml"))
      .flatMap((name) => {
        try {
          const data = parseYaml(readFileSync(new URL(name, dir(d)), "utf8"));
          return [{ name, data }];
        } catch (e) {
          loadErrors.push(`${name}: parse error: ${(e as Error).message}`);
          return [];
        }
      });
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
  const lessonDir = dir("lessons/en");
  const lessons = readdirSync(lessonDir)
    .filter((n) => n.endsWith(".md"))
    .flatMap((name) => {
      const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(
        readFileSync(new URL(name, lessonDir), "utf8"),
      );

      try {
        if (!m) throw new Error("no front matter between --- lines");
        return [{ name, data: parseYaml(m[1]!) }];
      } catch (e) {
        loadErrors.push(`${name}: parse error: ${(e as Error).message}`);
        return [];
      }
    });
  const {
    errors,
    coverage,
    lessons: lessonInfo,
    flows: flowCount,
    mappings: mappingCount,
  } = checkContent({
    schema,
    messages: load("messages"),
    annotations: load("annotations"),
    samples,
    lessons,
    flows: load("flows"),
    mappings: load("mappings"),
    requireAllSteps: true,
  });
  console.log(
    `Coverage: ${coverage.annotated} of ${coverage.total} distinct sample element paths annotated`,
  );
  console.log(`Flows: ${flowCount}`);
  console.log(`Mappings: ${mappingCount}`);
  console.log(`Lessons: ${lessonInfo.count} of ${STEPS.length} steps`);
  const byType = new Set(
    load("annotations").flatMap((f) =>
      Object.keys((f.data as { byType?: object }).byType ?? {}),
    ),
  );
  const st = sharedTypes(schema, byType);
  console.log(`Shared types: ${st.overlaid} of ${st.total} overlaid`);
  errors.unshift(...loadErrors);
  if (errors.length) {
    console.error(errors.map((e) => `ERROR ${e}`).join("\n"));
    process.exit(1);
  }
}
