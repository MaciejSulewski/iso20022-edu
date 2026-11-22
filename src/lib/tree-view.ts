// Pure view logic for the SchemaTree island: visible rows, lookup, overlay merge, hash and search.
import type { TreeChild } from "./schema-tree.ts";
import type { Overlay, XmlNode } from "./xml-tree.ts";
import { elementState } from "./xml-view.ts";

/** A type file: its rows once fetched, or where the fetch stands. */
export type Load = TreeChild[] | "loading" | "error";
type Element = Exclude<TreeChild, { any: true }>;

export type Row = {
  path: string;
  depth: number; // 1-based, as aria-level
  pos: number;
  size: number;
  child: TreeChild;
  /** Its type is already on the ancestor chain: shown as a leaf. */
  recursive: boolean;
  open: boolean;
  /** Open, but its type file is not here yet. */
  load?: "loading" | "error";
};

/** Optional elements (and an optional `any`) are hidden by the required-only filter; choice alternatives stay. */
export const isOptional = (c: TreeChild) =>
  c.any ? c.min === 0 : elementState(c).presence === "optional";

const expandable = (c: TreeChild): c is Element =>
  !c.any && c.kind === "complex";

/** Pre-order rows of the open part of the tree. */
export function treeRows(
  root: TreeChild[],
  types: Record<string, Load>,
  expanded: Set<string>,
  rootType: string,
  requiredOnly: boolean,
): Row[] {
  const out: Row[] = [];
  const walk = (
    list: TreeChild[],
    prefix: string,
    depth: number,
    chain: string[],
  ) => {
    const shown = requiredOnly ? list.filter((c) => !isOptional(c)) : list;
    shown.forEach((child, i) => {
      const path = prefix + (child.any ? "*" : child.tag);
      const recursive = expandable(child) && chain.includes(child.typeName);
      const open = expandable(child) && !recursive && expanded.has(path);
      const t = open
        ? (types[(child as Element).typeName] ?? "loading")
        : undefined;
      out.push({
        path,
        depth,
        pos: i + 1,
        size: shown.length,
        child,
        recursive,
        open,
        ...(typeof t === "string" && { load: t }),
      });
      if (Array.isArray(t))
        walk(t, path + "/", depth + 1, [...chain, (child as Element).typeName]);
    });
  };
  walk(root, "", 1, [rootType]);
  return out;
}

/** The elements along `path` from loaded data; undefined when a step is not loaded or does not exist. */
export function chainOf(
  root: TreeChild[],
  types: Record<string, Load>,
  path: string,
): Element[] | undefined {
  const out: Element[] = [];
  let list: Load | undefined = root;
  for (const seg of path.split("/")) {
    if (!Array.isArray(list)) return undefined;
    const c: TreeChild | undefined = list.find((x) => !x.any && x.tag === seg);
    if (!c || c.any) return undefined;
    out.push(c);
    list = types[c.typeName];
  }
  return out;
}

/** A tree record as the XmlNode ElementPanel reads, with the plain-English overlay merged in. */
export function toXmlNode(
  c: Element,
  path: string,
  overlay?: Overlay,
): XmlNode {
  const info: XmlNode["info"] = {
    isoName: c.isoName,
    definition: c.definition,
    typeName: c.typeName,
    min: c.min,
    max: c.max,
    mandatory: c.mandatory,
    repeating: c.repeating,
    choiceMember: c.choiceMember,
    choice: c.choice,
  };
  if (c.codes)
    info.codes = (
      c.codes as (
        string | { code: string; name?: string; definition?: string }
      )[]
    ).map((x) => (typeof x === "string" ? { code: x } : x));
  const o = overlay?.byPath[path] ?? overlay?.byType[c.typeName];
  if (o) {
    info.explanation = o.explanation.en;
    if (o.notes) info.notes = o.notes.en;
    if (o.examples) info.examples = o.examples;
  }
  return { path, tag: c.tag, children: [], info };
}

/** `A/B/C` -> `A/B`; "" for a top-level path. */
export const parentOf = (path: string) => {
  const k = path.lastIndexOf("/");
  return k > 0 ? path.slice(0, k) : "";
};

/** `A/B/C` -> [`A`, `A/B`]: the paths to expand to show it. */
export const ancestors = (path: string) =>
  path
    .split("/")
    .slice(0, -1)
    .map((_, i, a) => a.slice(0, i + 1).join("/"));

/** `#GrpHdr/MsgId` -> `GrpHdr/MsgId`; undefined for an empty or malformed hash. */
export function parseHash(hash: string): string | undefined {
  try {
    const p = decodeURIComponent(hash.replace(/^#/, ""))
      .split("/")
      .filter(Boolean)
      .join("/");
    return p || undefined;
  } catch {
    return undefined;
  }
}

/** Case-insensitive substring match on path (tags included) and ISO name; spaces are ignored for names ("debtor agent"). */
export function searchTree(
  index: [string, string][],
  query: string,
  limit = 50,
): { hits: [string, string][]; total: number } {
  const q = query.trim().toLowerCase();
  if (!q) return { hits: [], total: 0 };
  const flat = q.replace(/\s+/g, "");
  const all = index.filter(
    ([p, n]) => p.toLowerCase().includes(q) || n.toLowerCase().includes(flat),
  );
  return { hits: all.slice(0, limit), total: all.length };
}
