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
