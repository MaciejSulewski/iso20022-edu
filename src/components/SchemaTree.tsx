import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { TreeChild } from "../lib/schema-tree.ts";
import type { Overlay, XmlNode } from "../lib/xml-tree.ts";
import { elementState, GLYPH, TONE, type Presence } from "../lib/xml-view.ts";
import {
  ancestors,
  chainOf,
  isOptional,
  parentOf,
  searchTree,
  toXmlNode,
  treeRows,
  type Load,
  type Row,
} from "../lib/tree-view.ts";

export type TreeLabels = {
  tree: string;
  occurs: string;
  states: Record<Presence | "repeats", string>;
  required: string;
  requiredHint: string;
  search: string;
  searchHint: string;
  searchLoading: string;
  searchError: string;
  searchCount: string; // {n}
  searchOne: string;
  searchMore: string; // {n} {shown}
  searchNone: string;
  searchResults: string;
  loading: string;
  error: string;
  retry: string;
  recursive: string;
  any: string;
  anyHint: string;
};

const occurs = (c: TreeChild) =>
  `[${c.min}..${c.max === "unbounded" ? "n" : c.max}]`;
const rowEl = (path: string) =>
  document.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);

// Controlled by `selected` (a path): every new selection, from any pane, expands the tree to it.
// The record of the selected element, once loaded, goes to `onRecord` for the details panel.
export default function SchemaTree({
  id,
  base,
  rootType,
  root,
  overlay,
  labels,
  selected,
  onSelect,
  onRecord,
}: {
  id: string;
  base: string;
  rootType: string;
  root: TreeChild[];
  overlay?: Overlay | undefined;
  labels: TreeLabels;
  selected: string | null;
  onSelect: (path: string | null) => void;
  onRecord: (node: XmlNode | undefined) => void;
}) {
  const [types, setTypes] = useState<Record<string, Load>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<
    [string, string][] | "loading" | "error"
  >();
  const cache = useRef(new Map<string, Promise<TreeChild[] | undefined>>());
  const searchId = useId();
  const gen = useRef(0); // bumped by every openPath and every clear: a slower openPath that started earlier gives up

  const rows = treeRows(root, types, expanded, rootType, requiredOnly);
  const selChain = selected ? chainOf(root, types, selected) : undefined;
  const sel = selChain?.at(-1);
  const tabStop = rows.some((r) => r.path === focus)
    ? focus
    : (rows.find((r) => r.path === selected)?.path ?? rows[0]?.path);
  const found = Array.isArray(index) ? searchTree(index, query) : undefined;

  function load(type: string): Promise<TreeChild[] | undefined> {
    let p = cache.current.get(type);
    if (p) return p;
    setTypes((s) => ({ ...s, [type]: "loading" }));
    p = fetch(`${base}tree/${id}/types/${encodeURIComponent(type)}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<TreeChild[]>;
      })
      .then(
        (d) => {
          setTypes((s) => ({ ...s, [type]: d }));
          return d;
        },
        () => {
          cache.current.delete(type); // the next expand or retry fetches again
          setTypes((s) => ({ ...s, [type]: "error" }));
          return undefined;
        },
      );
    cache.current.set(type, p);
    return p;
  }

  function select(path: string) {
    setFocus(path);
    onSelect(path);
  }

  // Expands every ancestor of `path` (fetching type files in order) and moves the tab stop to it. Unknown paths do nothing.
  // Resolves true when it opened; false when the path is unknown, a load failed or a newer openPath won.
  async function openPath(path: string): Promise<boolean> {
    const g = ++gen.current;
    const segs = path.split("/");
    const chain: TreeChild[] = [];
    const seen = [rootType];
    const expand = (n: number) =>
      setExpanded((e) => {
        const next = new Set(e);
        ancestors(path)
          .slice(0, n)
          .forEach((p) => next.add(p));
        return next;
      });
    let list: TreeChild[] | undefined = root;
    for (const [i, seg] of segs.entries()) {
      const c = list.find((x) => !x.any && x.tag === seg);
      if (!c || c.any) return false;
      chain.push(c);
      if (i === segs.length - 1) break;
      if (c.kind !== "complex" || seen.includes(c.typeName)) return false; // a recursive leaf has no children to show
      seen.push(c.typeName);
      const next = await load(c.typeName);
      if (gen.current !== g) return false;
      if (!next) {
        expand(i + 1); // show the failed branch with its retry
        return false;
      }
      list = next;
    }
    expand(segs.length);
    if (chain.some(isOptional)) setRequiredOnly(false); // a selection hidden by the filter shows everything
    setFocus(path);
    requestAnimationFrame(() =>
      rowEl(path)?.scrollIntoView({ block: "nearest" }),
    );
    return true;
  }

  useEffect(() => {
    if (selected) void openPath(selected);
    else gen.current++; // cleared: a pending openPath gives up
  }, [selected]);

  // sel is the fetched record object, so this fires once per loaded selection, not every render
  useEffect(() => {
    onRecord(sel && selected ? toXmlNode(sel, selected, overlay) : undefined);
  }, [sel, selected]);

  function toggle(r: Row) {
    if (r.child.any || r.child.kind !== "complex" || r.recursive) return;
    if (r.open) {
      // a selection inside a collapsing branch moves to that branch
      if (selected?.startsWith(r.path + "/")) select(r.path);
    } else void load(r.child.typeName);
    setExpanded((e) => {
      const next = new Set(e);
      if (!next.delete(r.path)) next.add(r.path);
      return next;
    });
  }

  function setRequired(next: boolean) {
    setRequiredOnly(next);
    const k = next && selected ? (selChain?.findIndex(isOptional) ?? -1) : -1;
    if (k < 0) return;
    // the selection moves to the nearest visible ancestor, as in the annotated XML
    if (k > 0) select(selected!.split("/").slice(0, k).join("/"));
    else onSelect(null);
  }

  function retry(r: Row) {
    if (!r.child.any) void load(r.child.typeName);
  }

  function moveTo(path: string | undefined) {
    if (!path) return;
    setFocus(path);
    rowEl(path)?.focus();
  }

  function onKey(e: KeyboardEvent) {
    const i = rows.findIndex(
      (r) => r.path === (e.target as HTMLElement).dataset.path,
    );
    const r = rows[i];
    if (!r) return;
    const parent = parentOf(r.path);
    const act: Record<string, () => void> = {
      ArrowDown: () => moveTo(rows[i + 1]?.path),
      ArrowUp: () => moveTo(rows[i - 1]?.path),
      Home: () => moveTo(rows[0]?.path),
      End: () => moveTo(rows.at(-1)?.path),
      ArrowRight: () => {
        if (r.load === "error") retry(r);
        else if (!r.open) toggle(r);
        else if ((rows[i + 1]?.depth ?? 0) > r.depth) moveTo(rows[i + 1]!.path);
      },
      ArrowLeft: () => (r.open ? toggle(r) : moveTo(parent || undefined)),
      Enter: () => !r.child.any && select(r.path),
      " ": () => !r.child.any && select(r.path),
    };
    const f = act[e.key];
    if (!f) return;
    e.preventDefault();
    f();
  }

  function onSearchFocus() {
    if (Array.isArray(index) || index === "loading") return;
    setIndex("loading");
    fetch(`${base}tree/${id}/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<[string, string][]>;
      })
      .then(setIndex, () => setIndex("error"));
  }

  const status = !query.trim()
    ? ""
    : index === "loading"
      ? labels.searchLoading
      : index === "error"
        ? labels.searchError
        : !found
          ? ""
          : found.total === 0
            ? labels.searchNone
            : found.total > found.hits.length
              ? labels.searchMore
                  .replace("{n}", String(found.total))
                  .replace("{shown}", String(found.hits.length))
              : found.total === 1
                ? labels.searchOne
                : labels.searchCount.replace("{n}", String(found.total));

  return (
    <div class="min-w-0">
      <p class="mb-4 text-sm text-muted">{labels.occurs}</p>

      <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          aria-pressed={requiredOnly}
          aria-describedby={`${searchId}-req`}
          onClick={() => setRequired(!requiredOnly)}
          class={`min-h-6 rounded border px-3 py-1 ${requiredOnly ? "border-accent bg-accent text-accent-fg" : "border-line"}`}
        >
          {labels.required}
        </button>
        <span id={`${searchId}-req`} class="text-muted">
          {labels.requiredHint}
        </span>
      </div>
      <label for={searchId} class="block text-sm font-semibold">
        {labels.search}
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        autocomplete="off"
        aria-describedby={`${searchId}-hint ${searchId}-status`}
        onFocus={onSearchFocus}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        class="mt-1 min-h-9 w-full rounded border border-line bg-bg px-3 py-1 text-fg"
      />
      <p id={`${searchId}-hint`} class="mt-1 text-sm text-muted">
        {labels.searchHint}
      </p>
      <p
        id={`${searchId}-status`}
        role="status"
        class="mb-1 text-sm text-muted"
      >
        {status}
      </p>
      {found && found.hits.length > 0 && (
        <ul
          aria-label={labels.searchResults}
          class="mb-4 max-h-72 overflow-y-auto rounded border border-line"
        >
          {found.hits.map(([path, name]) => (
            <li key={path} class="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  void openPath(path).then((ok) => {
                    if (!ok) return;
                    select(path);
                    rowEl(path)?.focus();
                  });
                }}
                class="block min-h-9 w-full px-3 py-1 text-left hover:bg-surface"
              >
                <span class="font-semibold">{name}</span>
                <span class="block font-mono text-xs break-all text-muted">
                  {path}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        role="tree"
        aria-label={labels.tree}
        onKeyDown={onKey}
        class="font-mono text-sm leading-6"
      >
        {rows.map((r) => {
          const c = r.child;
          const st = elementState(
            c.any
              ? {
                  mandatory: c.min > 0,
                  choiceMember: false,
                  repeating: c.max !== 1,
                }
              : c,
          );
          const expandable = !c.any && c.kind === "complex" && !r.recursive;
          const on = r.path === selected;
          return (
            <div
              key={r.path}
              role="treeitem"
              data-path={r.path}
              tabIndex={r.path === tabStop ? 0 : -1}
              aria-level={r.depth}
              aria-posinset={r.pos}
              aria-setsize={r.size}
              aria-expanded={expandable ? r.open : undefined}
              aria-selected={c.any ? undefined : on}
              aria-busy={r.load === "loading" || undefined}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                setFocus(r.path);
                if (!c.any) select(r.path);
              }}
              class={`flex cursor-pointer items-start hover:bg-surface ${on ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : ""}`}
            >
              <span class="flex w-9 shrink-0 text-center">
                <span aria-hidden="true" class={`w-4 ${TONE[st.presence]}`}>
                  {GLYPH[st.presence]}
                </span>
                <span aria-hidden="true" class={`w-4 ${TONE.repeats}`}>
                  {st.repeats ? GLYPH.repeats : ""}
                </span>
              </span>
              {Array.from({ length: r.depth - 1 }, (_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  class="w-5 shrink-0 self-stretch border-l border-line"
                />
              ))}
              <span
                aria-hidden="true"
                onClick={(e) => {
                  if (!expandable) return;
                  e.stopPropagation();
                  setFocus(r.path);
                  toggle(r);
                }}
                class="flex size-6 shrink-0 items-center justify-center text-muted hover:text-fg"
              >
                {expandable ? (r.open ? "▾" : "▸") : ""}
              </span>
              <span class="min-w-0 flex-1 px-1 break-words">
                {c.any ? (
                  <span class="font-sans italic">
                    {labels.any}
                    <span class="text-muted"> ({labels.anyHint})</span>
                  </span>
                ) : (
                  <>
                    <span class="text-accent">&lt;{c.tag}&gt;</span>{" "}
                    <span class="font-sans text-muted">{c.isoName}</span>
                  </>
                )}
                <span class="sr-only">
                  , {labels.states[st.presence]}
                  {st.repeats ? `, ${labels.states.repeats}` : ""}
                </span>
                {r.recursive && (
                  <span class="block font-sans text-xs text-muted italic">
                    ↺ {labels.recursive}
                  </span>
                )}
                {r.load === "loading" && (
                  <span class="block font-sans text-xs text-muted">
                    {labels.loading}
                  </span>
                )}
                {r.load === "error" && (
                  <span class="block font-sans text-xs">
                    {labels.error}{" "}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => retry(r)}
                      class="text-accent underline underline-offset-2"
                    >
                      {labels.retry}
                    </button>
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                class="shrink-0 pl-2 text-xs leading-6 text-muted"
              >
                {occurs(c)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
