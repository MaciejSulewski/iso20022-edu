// Diffs two generated schema JSON files: elements by path, types, constraints.
import { readFileSync } from "node:fs";
import { SchemaModel, type Schema } from "./schema-model.ts";
import { rootTypeName } from "../src/lib/resolver.ts";

type Change = { path: string; field: string; old: unknown; new: unknown };
type Section = { added: string[]; removed: string[]; changed: string[] };
export type Diff = {
  added: string[];
  removed: string[];
  changed: Change[];
  types: Section;
  constraints: Section;
};

const FIELDS = ["type", "min", "max", "isoName", "definition"] as const;

// Every element path gets its own entry, so a shared type shows up under each parent.
function elementsByPath(s: Schema) {
  const out = new Map<string, Record<string, unknown>>();
  const walk = (type: string, prefix: string, stack: string[]) => {
    for (const e of s.complexTypes[type]?.elements ?? []) {
      const path = `${prefix}/${"any" in e ? "#any" : e.tag}`;
      out.set(path, e);
      // A type already on the current path would recurse forever.
      if ("type" in e && !stack.includes(e.type))
        walk(e.type, path, [...stack, e.type]);
    }
  };
  const root = rootTypeName(s);
  if (root) walk(root, s.root, [root]);
  return out;
}

const sorted = (keys: Iterable<string>) => [...keys].sort();

function diffKeys(a: Set<string>, b: Set<string>) {
  return {
    added: sorted([...b].filter((k) => !a.has(k))),
    removed: sorted([...a].filter((k) => !b.has(k))),
  };
}

const codeSet = (t: Schema["simpleTypes"][string]) =>
  new Set((t.codes ?? []).map((c) => (typeof c === "string" ? c : c.code)));

export function diffSchemas(oldS: Schema, newS: Schema): Diff {
  const a = elementsByPath(oldS);
  const b = elementsByPath(newS);
  const { added, removed } = diffKeys(new Set(a.keys()), new Set(b.keys()));
  const changed: Change[] = [];
  for (const path of sorted(a.keys())) {
    const x = a.get(path)!;
    const y = b.get(path);
    if (!y) continue;
    for (const field of FIELDS)
      if (x[field] !== y[field])
        changed.push({ path, field, old: x[field], new: y[field] });
  }

  const types: Section = { added: [], removed: [], changed: [] };
  for (const kind of ["complexTypes", "simpleTypes"] as const) {
    const d = diffKeys(
      new Set(Object.keys(oldS[kind])),
      new Set(Object.keys(newS[kind])),
    );
    types.added.push(...d.added.map((n) => `${kind} ${n}`));
    types.removed.push(...d.removed.map((n) => `${kind} ${n}`));
  }
  for (const name of sorted(Object.keys(oldS.simpleTypes))) {
    const x = oldS.simpleTypes[name]!;
    const y = newS.simpleTypes[name];
    if (!y) continue;
    const c = diffKeys(codeSet(x), codeSet(y));
    for (const code of c.added)
      types.changed.push(`${name}: code added ${code}`);
    for (const code of c.removed)
      types.changed.push(`${name}: code removed ${code}`);
    for (const f of ["base", "pattern", "minLength", "maxLength"] as const)
      if (x[f] !== y[f])
        types.changed.push(
          `${name}: ${f} ${JSON.stringify(x[f])} -> ${JSON.stringify(y[f])}`,
        );
  }

  const cons = (s: Schema) =>
    new Map((s.constraints ?? []).map((c) => [c.name, c.definition]));
  const ca = cons(oldS);
  const cb = cons(newS);
  const constraints: Section = {
    ...diffKeys(new Set(ca.keys()), new Set(cb.keys())),
    changed: sorted(ca.keys()).filter(
      (n) => cb.has(n) && ca.get(n) !== cb.get(n),
    ),
  };
  return { added, removed, changed, types, constraints };
}

export function formatDiff(d: Diff): string {
  const lines: string[] = [];
  const sec = (title: string, items: string[]) => {
    lines.push(`${title} (${items.length})`, ...items.map((i) => `  ${i}`));
  };
  sec("Elements added", d.added);
  sec("Elements removed", d.removed);
  sec(
    "Elements changed",
    d.changed.map(
      (c) =>
        `${c.path}: ${c.field} ${JSON.stringify(c.old)} -> ${JSON.stringify(c.new)}`,
    ),
  );
  for (const [name, s] of [
    ["Types", d.types],
    ["Constraints", d.constraints],
  ] as const) {
    sec(`${name} added`, s.added);
    sec(`${name} removed`, s.removed);
    sec(`${name} changed`, s.changed);
  }
  const empty =
    !d.added.length &&
    !d.removed.length &&
    !d.changed.length &&
    [d.types, d.constraints].every(
      (s) => !s.added.length && !s.removed.length && !s.changed.length,
    );
  return empty ? "No differences." : lines.join("\n");
}

if (import.meta.main) {
  const files = process.argv.slice(2);
  if (files.length !== 2) {
    console.error("usage: node scripts/schema-diff.ts <old.json> <new.json>");
    process.exit(1);
  }
  const [oldS, newS] = files.map((f) => {
    try {
      return SchemaModel.parse(JSON.parse(readFileSync(f, "utf8")));
    } catch (e) {
      console.error(`${f}: ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }
  }) as [Schema, Schema];
  console.log(formatDiff(diffSchemas(oldS, newS)));
}
