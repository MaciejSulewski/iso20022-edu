// Pure view logic for the annotated XML: element states, preview text, beginner-mode filter.
import type { XmlNode } from "./xml-tree.ts";

export type Presence = "required" | "optional" | "choice";
type Info = Pick<XmlNode["info"], "mandatory" | "choiceMember" | "repeating">;

/** One presence state per element (choice members are never "optional"), plus repeating. */
export function elementState(i: Info): {
  presence: Presence;
  repeats: boolean;
} {
  const presence = i.choiceMember
    ? "choice"
    : i.mandatory
      ? "required"
      : "optional";
  return { presence, repeats: i.repeating };
}

/** First sentence of a text; the whole text when it has no sentence end. */
export function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return /^.*?[.!?](?=\s|$)/.exec(t)?.[0] ?? t;
}

/** Preview text: plain-English explanation first, else the ISO definition. */
export const previewText = (i: { explanation?: string; definition: string }) =>
  firstSentence(i.explanation || i.definition);

const size = (n: XmlNode): number =>
  1 + n.children.reduce((a, c) => a + size(c), 0);

/**
 * Beginner mode: drops optional elements and everything under them, with their closing rows.
 * Rows are pre-order; `hidden` counts the elements removed, descendants included, even when collapsed.
 */
export function visibleRows<
  R extends { node: XmlNode; depth: number; close?: boolean },
>(rows: R[], beginner: boolean): { rows: R[]; hidden: number } {
  if (!beginner) return { rows, hidden: 0 };
  const out: R[] = [];
  let hidden = 0;
  let skip = -1; // depth of the hidden subtree being skipped
  for (const r of rows) {
    const optional = elementState(r.node.info).presence === "optional";
    if (skip >= 0 && r.depth > skip) continue;
    skip = -1;
    if (r.close) {
      if (!optional) out.push(r); // a hidden branch drops its own closing row
      continue;
    }
    if (optional) {
      skip = r.depth;
      hidden += size(r.node);
    } else out.push(r);
  }
  return { rows: out, hidden };
}

/** Does this element id sit in (or is) a branch hidden by beginner mode? */
export const isHidden = (
  id: string,
  byId: Map<string, { node: XmlNode }>,
): boolean => {
  const parts = id.split("/");
  return parts.some(
    (_, i) =>
      elementState(byId.get(parts.slice(0, i + 1).join("/"))!.node.info)
        .presence === "optional",
  );
};
