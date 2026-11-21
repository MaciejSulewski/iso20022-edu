// Parses a message sample into a tree of resolved elements. Pure: no Astro or browser imports.
import { XMLParser } from "fast-xml-parser";
import type { z } from "zod";
import type { Schema } from "../../scripts/schema-model.ts";
import type { AnnotationSchema } from "./content-schemas.ts";
import { resolvePath } from "./resolver.ts";

export type Overlay = Pick<
  z.infer<typeof AnnotationSchema>,
  "byPath" | "byType"
>;

export type Raw = {
  tag: string;
  value?: string;
  attrs?: Record<string, string>;
  children: Raw[];
};

export type XmlNode = {
  /** "GrpHdr/MsgId": no indexes, no Document/root prefix. */
  path: string;
  tag: string;
  value?: string;
  attrs?: Record<string, string>;
  /** 1-based, only for repeated siblings, display only. Repeats share one path. */
  repeatIndex?: number;
  children: XmlNode[];
  info: {
    isoName: string;
    definition: string;
    typeName: string;
    min: number;
    max: number | "unbounded";
    mandatory: boolean;
    repeating: boolean;
    choiceMember: boolean;
    choice: boolean;
    codes?: { code: string; name?: string; definition?: string }[];
    explanation?: string;
    notes?: string;
    examples?: string[];
  };
};

type Entry = Record<string, unknown>;

function convert(entries: Entry[]): Raw[] {
  const out: Raw[] = [];
  for (const e of entries) {
    const tag = Object.keys(e).find((k) => k !== ":@");
    if (!tag || tag === "#text" || tag.startsWith("?")) continue;
    const kids = e[tag] as Entry[];
    const children = convert(kids);
    const text = kids
      .map((k) => k["#text"])
      .filter((v) => v !== undefined)
      .join("");
    const node: Raw = { tag, children };
    if (!children.length && text) node.value = text;
    const at = e[":@"] as Record<string, string> | undefined;
    if (at)
      node.attrs = Object.fromEntries(
        Object.entries(at).map(([k, v]) => [k.slice(2), v]),
      );
    out.push(node);
  }
  return out;
}

/** Children of Document/<root>, in document order; undefined when that root is missing. */
export function parseXml(xml: string, root: string): Raw[] | undefined {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
  });
  const doc = convert(parser.parse(xml) as Entry[]).find(
    (n) => n.tag === "Document",
  );
  return doc?.children.find((n) => n.tag === root)?.children;
}

/** Tag paths of every element, no indexes. */
export function elementPaths(raw: Raw[], prefix = ""): string[] {
  return raw.flatMap((n) => [
    `${prefix}${n.tag}`,
    ...elementPaths(n.children, `${prefix}${n.tag}/`),
  ]);
}

export function buildTree(
  xml: string,
  schema: Schema,
  overlay?: Overlay,
): XmlNode[] {
  const raw = parseXml(xml, schema.root);
  if (!raw) throw new Error(`expected root Document/${schema.root}`);
  const build = (nodes: Raw[], prefix: string): XmlNode[] => {
    const seen = new Map<string, number>();
    return nodes.map((n) => {
      const path = `${prefix}${n.tag}`;
      const r = resolvePath(schema, path);
      if (!r)
        throw new Error(`element "${path}" does not resolve in ${schema.id}`);
      const i = (seen.get(n.tag) ?? 0) + 1;
      seen.set(n.tag, i);
      const o = overlay?.byPath[r.path] ?? overlay?.byType[r.typeName];
      const info: XmlNode["info"] = {
        isoName: r.isoName,
        definition: r.definition,
        typeName: r.typeName,
        min: r.min,
        max: r.max,
        mandatory: r.mandatory,
        repeating: r.repeating,
        choiceMember: r.choiceMember,
        choice: r.choice,
      };
      if (r.codes)
        info.codes = r.codes.map((c) =>
          typeof c === "string" ? { code: c } : c,
        );
      if (o) {
        info.explanation = o.explanation.en;
        if (o.notes) info.notes = o.notes.en;
        if (o.examples) info.examples = o.examples;
      }
      const node: XmlNode = {
        path,
        tag: n.tag,
        children: build(n.children, `${path}/`),
        info,
      };
      if (n.value !== undefined) node.value = n.value;
      if (n.attrs) node.attrs = n.attrs;
      if (nodes.filter((s) => s.tag === n.tag).length > 1) node.repeatIndex = i;
      return node;
    });
  };
  return build(raw, "");
}
