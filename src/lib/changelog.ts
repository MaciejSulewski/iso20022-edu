// Pure helper for the changelog page. No Astro or browser imports.

/** Newest date first; on the same date, id descending, so the order is stable. */
export function sortEntries<T extends { id: string; date: string }>(
  entries: T[],
): T[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
}
