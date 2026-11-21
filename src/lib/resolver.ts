// Resolves tag paths against the generated schema JSON. No Astro or browser imports.
import type { Schema } from "../../scripts/schema-model.ts";

type Complex = Schema["complexTypes"][string];
type Simple = Schema["simpleTypes"][string];
type Element = Complex["elements"][number];

export type Resolved = {
  path: string;
  tag: string;
  isoName: string;
  definition: string;
  typeName: string;
  kind: "complex" | "simple";
  /** min, max, mandatory and repeating are local to the parent element, not inherited from ancestors. */
  min: number;
  max: number | "unbounded";
  /** Required when its parent is present (min > 0). Always false for a choice member: exactly one alternative is required. */
  mandatory: boolean;
  /** max > 1, relative to the parent. */
  repeating: boolean;
  /** Parent is a choice type: this element is one alternative. */
  choiceMember: boolean;
  /** Complex type: a choice type; its children are alternatives. */
  choice: boolean;
  complex?: Complex | undefined;
  simple?: Simple | undefined;
  /** Simple types only; plain strings or {code,name,definition}. */
  codes?: Simple["codes"];
};

// The message root type is the one complex type no element points to. The XSD
// Document/<root> wrapper is not a type in the JSON, so it is optional in paths.
const roots = new WeakMap<Schema, string | undefined>();
export function rootTypeName(schema: Schema): string | undefined {
  if (roots.has(schema)) return roots.get(schema);
  const r = findRoot(schema);
  roots.set(schema, r);
  return r;
}

function findRoot(schema: Schema): string | undefined {
  const used = new Set(
    Object.values(schema.complexTypes).flatMap((c) =>
      c.elements.flatMap((e) => ("any" in e ? [] : [e.type])),
    ),
  );
  return Object.keys(schema.complexTypes).find((k) => !used.has(k));
}

export function childrenOf(schema: Schema, typeName: string): Element[] {
  return schema.complexTypes[typeName]?.elements ?? [];
}

export function resolvePath(
  schema: Schema,
  path: string,
): Resolved | undefined {
  let segs = path.split("/").filter(Boolean);
  if (segs[0] === "Document") segs = segs.slice(1);
  if (segs[0] === schema.root) segs = segs.slice(1);
  let typeName = rootTypeName(schema);
  let cur: Complex | undefined = typeName
    ? schema.complexTypes[typeName]
    : undefined;
  let el: Element | undefined;
  let parent: Complex | undefined;
  if (!segs.length) return undefined;
  for (const seg of segs) {
    if (!cur) return undefined;
    parent = cur;
    el = cur.elements.find((e) => "tag" in e && e.tag === seg);
    if (!el || "any" in el) return undefined;
    typeName = el.type;
    cur = schema.complexTypes[typeName];
  }
  if (!el || !("tag" in el) || !typeName) return undefined;
  const simple = schema.simpleTypes[typeName];
  if (!cur && !simple) return undefined;
  return {
    path: segs.join("/"),
    tag: el.tag,
    isoName: el.isoName,
    definition: el.definition,
    typeName,
    kind: cur ? "complex" : "simple",
    min: el.min,
    max: el.max,
    mandatory: el.min > 0 && !parent?.choice,
    repeating: el.max === "unbounded" || el.max > 1,
    choiceMember: !!parent?.choice,
    choice: !!cur?.choice,
    complex: cur,
    simple,
    codes: simple?.codes,
  };
}
