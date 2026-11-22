// Pure logic for the command palette: the open shortcut, element and page results, status wording.
import type { UiKey } from "../i18n/t.ts";
import { searchTree } from "./tree-view.ts";

/** Selector for the palette dialog; the island puts this attribute on it. */
export const PALETTE_SELECTOR = "[data-palette]";

/** The part of a DOM element `shouldOpen` reads. */
export type PaletteTarget = {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
} | null;

export type KeyLike = {
  ctrlKey: boolean;
  metaKey: boolean;
  key: string;
  target: PaletteTarget;
};

/** Ctrl or Cmd plus K opens, unless the focus is in a text field outside the palette. */
export function shouldOpen(e: KeyLike): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return false;
  const t = e.target;
  if (!t) return true;
  const field =
    ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName?.toUpperCase() ?? "") ||
    t.isContentEditable === true;
  return !field || Boolean(t.closest?.(PALETTE_SELECTOR));
}

/** A name cut into runs; `match` runs are shown in `<mark>`. */
export type Part = { text: string; match: boolean };

export type ElementHit = {
  id: string;
  path: string;
  name: string;
  parts: Part[];
};

/** Split `name` around the first match of `query`, ignoring case and spaces in the query. */
export function splitName(name: string, query: string): Part[] {
  const flat = query.trim().toLowerCase().replace(/\s+/g, "");
  const k = flat ? name.toLowerCase().indexOf(flat) : -1;
  if (k < 0) return [{ text: name, match: false }];
  const end = k + flat.length;
  return [
    { text: name.slice(0, k), match: false },
    { text: name.slice(k, end), match: true },
    { text: name.slice(end), match: false },
  ].filter((p) => p.text);
}

/** Element hits across the loaded message indexes: the first `limit` and the total count. */
export function elementResults(
  indexes: { id: string; index: [string, string][] }[],
  query: string,
  limit = 8,
): { hits: ElementHit[]; total: number } {
  const all = indexes.flatMap(({ id, index }) =>
    searchTree(index, query, Infinity).hits.map(([path, name]) => ({
      id,
      path,
      name,
      parts: splitName(name, query),
    })),
  );
  return { hits: all.slice(0, limit), total: all.length };
}

/** A Pagefind hit once its `data()` is loaded (only the fields used here). */
export type PageData = {
  url: string;
  meta?: { title?: string };
  excerpt: string;
};
export type PageHit = { title: string; url: string; excerpt: string };

/** The first `limit` Pagefind hits as title, url and excerpt (the excerpt keeps Pagefind's `<mark>` tags). */
export function pageResults(pages: PageData[], limit = 5): PageHit[] {
  return pages.slice(0, limit).map((p) => ({
    title: p.meta?.title ?? p.url,
    url: p.url,
    excerpt: p.excerpt,
  }));
}

/** The status line as a UI key plus the values for its `{n}` and `{shown}` slots. */
export function status(
  total: number,
  shown: number,
  state: "ready" | "loading" | "error" = "ready",
): { key: UiKey; n: number; shown: number } {
  const key: UiKey =
    state === "loading"
      ? "palette.loading"
      : state === "error"
        ? "palette.error"
        : total === 0
          ? "palette.none"
          : total === 1
            ? "palette.count.one"
            : shown < total
              ? "palette.showing"
              : "palette.count";
  return { key, n: total, shown };
}
