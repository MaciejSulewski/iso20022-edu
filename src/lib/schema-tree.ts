// Pure data layer for the SchemaTree page: per-type child records, search index, deep-link chain.
import type { Schema } from "../../scripts/schema-model.ts";
import { describe, resolvePath, rootTypeName } from "./resolver.ts";

/** One row of a type file. `any` rows (xs:any envelope) are non-expandable. */
export type TreeChild =
  | {
      any: true;
      min: number;
      max: number | "unbounded";
    }
  | {
      any?: undefined;
      tag: string;
      isoName: string;
      definition: string;
      typeName: string;
      kind: "complex" | "simple";
      min: number;
      max: number | "unbounded";
      mandatory: boolean;
      repeating: boolean;
      choiceMember: boolean;
      choice: boolean;
      codes?: unknown[] | undefined;
    };

export function childRecords(schema: Schema, typeName: string): TreeChild[] {
  const parent = schema.complexTypes[typeName];
  return (parent?.elements ?? []).flatMap((el): TreeChild[] => {
    if ("any" in el) return [{ any: true, min: el.min, max: el.max }];
    const r = describe(schema, parent, el, el.tag);
    if (!r) return [];
    const { tag, isoName, definition, typeName, kind, min, max } = r;
    const { mandatory, repeating, choiceMember, choice, codes } = r;
    return [
      {
        tag,
        isoName,
        definition,
        typeName,
        kind,
        min,
        max,
        mandatory,
        repeating,
        choiceMember,
        choice,
        ...(codes && { codes }),
      },
    ];
  });
}

/** Every element path with its ISO name. A type already on the ancestor chain is listed but not entered again. */
export function searchIndex(schema: Schema): [string, string][] {
  const out: [string, string][] = [];
  const walk = (typeName: string, prefix: string, chain: string[]) => {
    for (const el of schema.complexTypes[typeName]?.elements ?? []) {
      if ("any" in el) continue;
      const path = prefix ? `${prefix}/${el.tag}` : el.tag;
      out.push([path, el.isoName]);
      if (schema.complexTypes[el.type] && !chain.includes(el.type))
        walk(el.type, path, [...chain, el.type]);
    }
  };
  const root = rootTypeName(schema);
  if (root) walk(root, "", [root]);
  return out;
}

/** `A/B/C` -> [`A`, `A/B`, `A/B/C`]; undefined when the path does not resolve. */
export function pathChain(schema: Schema, path: string): string[] | undefined {
  const r = resolvePath(schema, path);
  if (!r) return undefined;
  const segs = r.path.split("/");
  return segs.map((_, i) => segs.slice(0, i + 1).join("/"));
}
