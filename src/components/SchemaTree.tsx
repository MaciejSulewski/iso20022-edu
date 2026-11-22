import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { TreeChild } from "../lib/schema-tree.ts";
import type { Overlay } from "../lib/xml-tree.ts";
import { elementState, GLYPH, TONE, type Presence } from "../lib/xml-view.ts";
import {
  chainOf,
  isOptional,
  parseHash,
  searchTree,
  toXmlNode,
  treeRows,
  type Load,
  type Row,
} from "../lib/tree-view.ts";
import ElementPanel, { type PanelLabels } from "./ElementPanel";

type Labels = PanelLabels & {
  tree: string;
  panel: string;
  close: string;
  legend: string;
  legendNote: string;
  occurs: string;
  states: Record<Presence | "repeats", string>;
  hints: Record<Presence | "repeats", string>;
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

const isMobile = () => !matchMedia("(min-width: 1024px)").matches;
const occurs = (c: TreeChild) =>
  `[${c.min}..${c.max === "unbounded" ? "n" : c.max}]`;
const rowEl = (path: string) =>
  document.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);

export default function SchemaTree({
  id,
  base,
  rootType,
  root,
  overlay,
  labels,
}: {
  id: string;
  base: string;
  rootType: string;
  root: TreeChild[];
  overlay?: Overlay | undefined;
  labels: Labels;
}) {
  const [types, setTypes] = useState<Record<string, Load>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [desktop, setDesktop] = useState(true); // true on the server: the aside is CSS-hidden below lg
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<
    [string, string][] | "loading" | "error"
  >();
  const cache = useRef(new Map<string, Promise<TreeChild[] | undefined>>());
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const searchId = useId();
  const cur = useRef(selected);
  cur.current = selected;

  const rows = treeRows(root, types, expanded, rootType, requiredOnly);
  const selChain = selected ? chainOf(root, types, selected) : undefined;
  const sel = selChain?.at(-1);
  const node = sel && selected ? toXmlNode(sel, selected, overlay) : undefined;
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

  function select(path: string, openSheet = true) {
    setSelected(path);
    setFocus(path);
    if (openSheet && isMobile()) setSheet(true);
    // replaceState: selecting does not fill the back button, and fires no hashchange
    history.replaceState(null, "", `#${path}`);
  }

  // Expands every ancestor of `path` (fetching type files in order) and selects it. Unknown paths do nothing.
  async function openPath(path: string, openSheet = true) {
    const segs = path.split("/");
    const chain: TreeChild[] = [];
    const seen = [rootType];
    let list: TreeChild[] | undefined = root;
    for (const [i, seg] of segs.entries()) {
      const c = list?.find((x) => !x.any && x.tag === seg);
      if (!c || c.any) return;
      chain.push(c);
      if (i === segs.length - 1) break;
      if (c.kind !== "complex" || seen.includes(c.typeName)) return; // a recursive leaf has no children to show
      seen.push(c.typeName);
      list = await load(c.typeName);
    }
    setExpanded((e) => {
      const next = new Set(e);
      segs
        .slice(0, -1)
        .forEach((_, i) => next.add(segs.slice(0, i + 1).join("/")));
      return next;
    });
    if (chain.some(isOptional)) setRequiredOnly(false); // a link to a hidden element shows everything
    select(path, openSheet);
    requestAnimationFrame(() =>
      rowEl(path)?.scrollIntoView({ block: "nearest" }),
    );
  }

  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (sheet && !desktop && !d.open) d.showModal();
    if ((!sheet || desktop) && d.open) d.close();
    if (sheet && desktop) setSheet(false); // resized up: no stale modal on the way back
  }, [sheet, desktop]);

  useEffect(() => {
    const fromHash = () => {
      const path = parseHash(location.hash);
      if (path && path !== cur.current) void openPath(path);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);

  function toggle(r: Row) {
    if (r.child.any || r.child.kind !== "complex" || r.recursive) return;
    if (r.open) {
      // a selection inside a collapsing branch moves to that branch
      if (selected?.startsWith(r.path + "/")) select(r.path, false);
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
    if (k > 0) select(selected!.split("/").slice(0, k).join("/"), false);
    else {
      setSelected(null);
      history.replaceState(null, "", location.pathname + location.search);
    }
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
    const parent = r.path.slice(0, r.path.lastIndexOf("/"));
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
      ArrowLeft: () => (r.open ? toggle(r) : parent && moveTo(parent)),
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

  const panel = (
    <ElementPanel
      id={node ? selected : null}
      node={node}
      labels={labels}
      titleId={titleId}
      onSelect={(p) => void openPath(p, false)}
    />
  );

  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0">
        <dl
          aria-label={labels.legend}
          class="mb-1 grid gap-x-6 gap-y-1 rounded border border-line bg-surface p-3 text-sm sm:grid-cols-2"
        >
          {(["required", "optional", "choice", "repeats"] as const).map((k) => (
            <div key={k} class="flex gap-2">
              <dt class="flex shrink-0 gap-1 font-semibold">
                <span aria-hidden="true" class={`w-4 text-center ${TONE[k]}`}>
                  {GLYPH[k]}
                </span>
                {labels.states[k]}
              </dt>
              <dd class="text-muted">{labels.hints[k]}</dd>
            </div>
          ))}
        </dl>
        <p class="mb-1 text-sm text-muted">{labels.legendNote}</p>
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
                    void openPath(path).then(() => rowEl(path)?.focus());
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
      {desktop && (
        <aside
          aria-label={labels.panel}
          class="hidden h-fit max-h-[calc(100vh-2rem)] overflow-y-auto rounded border border-line bg-surface p-4 lg:sticky lg:top-4 lg:block"
        >
          {panel}
        </aside>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setSheet(false);
          // the browser returns focus to the opener; deep links have none, so do it here
          if (cur.current) rowEl(cur.current)?.focus();
        }}
        class="m-0 mt-auto max-h-[80vh] w-full max-w-none overflow-y-auto rounded-t-lg border-t border-line bg-bg p-4 pb-8 text-fg backdrop:bg-black/50"
      >
        {!desktop && sheet && (
          <>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              class="mb-2 ml-auto block min-h-6 rounded border border-line px-3 py-1 text-sm"
            >
              {labels.close}
            </button>
            {panel}
          </>
        )}
      </dialog>
    </div>
  );
}
