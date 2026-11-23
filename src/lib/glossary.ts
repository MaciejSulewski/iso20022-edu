// Pure helpers for the glossary pages and the element panel. No Astro or browser imports.
export type Term = {
  id: string;
  term: string;
  message: string;
  elements: string[];
};

/** Terms in reading order: by name, ignoring case. */
export function sortTerms<T extends { term: string }>(terms: T[]): T[] {
  return [...terms].sort((a, b) =>
    a.term.localeCompare(b.term, "en", { sensitivity: "base" }),
  );
}

/** Element path -> its term, for one message. A path in two terms keeps the first (in sorted order). */
export function termsByPath(
  terms: Term[],
  message: string,
): Record<string, { id: string; term: string }> {
  const out: Record<string, { id: string; term: string }> = {};
  for (const t of sortTerms(terms.filter((x) => x.message === message)))
    for (const path of t.elements) out[path] ??= { id: t.id, term: t.term };
  return out;
}
