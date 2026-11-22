// Pure logic for the Workspace island: which record the details panel shows for a path.
import type { XmlNode } from "./xml-tree.ts";

/** The first node with this path, in document order. */
export function findNode(nodes: XmlNode[], path: string): XmlNode | undefined {
  for (const n of nodes) {
    if (n.path === path) return n;
    const hit = findNode(n.children, path);
    if (hit) return hit;
  }
  return undefined;
}

/** A path in the sample uses its XML node (it carries the overlay); any other path the tree record, if it is for this path. */
export function panelNode(
  nodes: XmlNode[],
  path: string | null,
  record: XmlNode | undefined,
): XmlNode | undefined {
  if (!path) return undefined;
  return findNode(nodes, path) ?? (record?.path === path ? record : undefined);
}

/** Repeated siblings share a path, so rows are keyed "A/B[2]/C": the row id of one element under its parent id. */
export const rowKey = (parent: string, node: XmlNode): string =>
  `${parent}${parent ? "/" : ""}${node.tag}${node.repeatIndex ? `[${node.repeatIndex}]` : ""}`;

/** The row a selected path marks: the current row if it has that path, else the first row with it. */
export function shownRow(
  rows: { id: string; node: XmlNode }[],
  current: string | null,
  selected: string | null,
): string | null {
  if (!selected) return null;
  const cur = current ? rows.find((r) => r.id === current) : undefined;
  return cur?.node.path === selected
    ? cur.id
    : (rows.find((r) => r.node.path === selected)?.id ?? null);
}
