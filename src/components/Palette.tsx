import { useEffect, useId, useRef, useState } from "preact/hooks";
import {
  elementResults,
  excerptParts,
  pageResults,
  shouldOpen,
  type KeyLike,
  status,
  type PageData,
  type Part,
} from "../lib/palette.ts";

export type PaletteMessage = {
  id: string;
  name: string;
  url: string; // the message's page
  indexUrl: string; // its element index
};

export type PaletteLabels = {
  open: string;
  shortcut: string;
  shortcutMac: string;
  title: string;
  input: string;
  hint: string;
  groupElements: string;
  groupPages: string;
  retry: string;
  // status templates by key, with {n} and {shown} slots
  status: Record<string, string>;
};

type Index = { id: string; index: [string, string][] }[];
type Pagefind = {
  debouncedSearch: (
    q: string,
  ) => Promise<{ results: { data: () => Promise<PageData> }[] } | null>;
};
type PageRow = { kind: "page"; url: string; title: string; excerpt: string };
type Row =
  | { kind: "el"; id: string; path: string; name: string; parts: Part[] }
  | PageRow;

const norm = (p: string) => p.replace(/\/?$/, "/");

function Marked({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p) =>
        p.match ? (
          <mark class="bg-transparent font-bold text-inherit underline">
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

// One palette for every page. The element indexes and Pagefind load on the first open, never on page load.
export default function Palette({
  messages,
  pagefindUrl,
  labels,
}: {
  messages: PaletteMessage[];
  pagefindUrl: string;
  labels: PaletteLabels;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const seq = useRef(0);
  const ids = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<Index | "loading" | "error">();
  const [pf, setPf] = useState<Pagefind | null>();
  const [searching, setSearching] = useState(false);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [mac, setMac] = useState(false);

  function loadIndex() {
    input.current?.focus(); // the Retry button goes away: keep focus in the palette
    setIndex("loading");
    Promise.all(
      messages.map(async (m) => {
        const r = await fetch(m.indexUrl);
        if (!r.ok) throw new Error(String(r.status));
        return { id: m.id, index: (await r.json()) as [string, string][] };
      }),
    ).then(setIndex, () => setIndex("error"));
  }

  function open() {
    const d = dialog.current;
    if (!d) return;
    if (!d.open) d.showModal(); // Ctrl+K while open must not throw
    input.current?.focus();
    if (started.current) return;
    started.current = true;
    loadIndex();
    // missing in `astro dev`: the Pages group is then simply absent
    import(/* @vite-ignore */ pagefindUrl).then(
      (m) => setPf(m as Pagefind),
      () => setPf(null),
    );
  }

  useEffect(() => {
    setMac(/mac|iphone|ipad/i.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if (!shouldOpen(e as unknown as KeyLike)) return; // the target is an Element or the window
      e.preventDefault();
      open();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim();
  const el =
    q && Array.isArray(index)
      ? elementResults(index, q)
      : { hits: [], total: 0 };

  useEffect(() => {
    const mine = ++seq.current;
    setPages([]); // rows of the previous query must not be pickable meanwhile
    if (!q || !pf) {
      setSearching(false);
      return;
    }
    setSearching(true);
    pf.debouncedSearch(q)
      .then(async (s) => {
        if (!s || mine !== seq.current) return; // superseded by a newer query
        const data = await Promise.all(
          s.results.slice(0, 5).map((r) => r.data()),
        );
        if (mine === seq.current) {
          setPages(pageResults(data).map((p) => ({ kind: "page", ...p })));
          setSearching(false);
        }
      })
      .catch(() => {
        if (mine === seq.current) {
          setPages([]);
          setSearching(false);
        }
      });
  }, [q, pf]);

  const rows: Row[] = [
    ...el.hits.map((h) => ({ kind: "el" as const, ...h })),
    ...pages,
  ];
  const act = rows.length ? Math.min(active, rows.length - 1) : -1;
  const optId = (i: number) => `${ids}-o${i}`;

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (act >= 0)
      document.getElementById(optId(act))?.scrollIntoView({ block: "nearest" });
  }, [act]);

  function pick(r: Row) {
    dialog.current?.close(); // first, so its focus return cannot undo the selection
    if (r.kind === "page") {
      location.href = r.url;
      return;
    }
    const m = messages.find((x) => x.id === r.id);
    if (!m) return;
    if (
      norm(location.pathname) === norm(new URL(m.url, location.href).pathname)
    )
      location.hash = `#${r.path}`; // the Workspace listens for hashchange
    else location.href = `${m.url}#${r.path}`;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows.length) return;
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((act + d + rows.length) % rows.length);
    } else if (e.key === "Enter" && act >= 0) {
      e.preventDefault();
      pick(rows[act]!);
    }
  }

  const s = status(
    el.total + pages.length,
    el.hits.length + pages.length,
    index === "loading" ? "loading" : index === "error" ? "error" : "ready",
  );
  const pending = pf === undefined || searching; // Pagefind may still add rows
  const statusText =
    (q || index === "error") && !(s.key === "palette.none" && pending)
      ? (labels.status[s.key] ?? "")
          .replace("{n}", String(s.n))
          .replace("{shown}", String(s.shown))
      : "";

  const group = (title: string, kind: Row["kind"], offset: number) => {
    const list = rows.filter((r) => r.kind === kind);
    if (!list.length) return null;
    const hid = `${ids}-g${kind}`;
    return (
      <div role="group" aria-labelledby={hid}>
        <div
          id={hid}
          class="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase"
        >
          {title}
        </div>
        {list.map((r, k) => {
          const i = offset + k;
          return (
            <div
              key={i}
              id={optId(i)}
              role="option"
              aria-selected={i === act}
              onClick={() => pick(r)}
              onMouseMove={() => i !== act && setActive(i)}
              class={`flex min-h-11 cursor-pointer flex-col justify-center border-l-4 px-3 py-2 ${
                i === act ? "border-accent bg-surface" : "border-transparent"
              }`}
            >
              {r.kind === "el" ? (
                <>
                  <span class="break-words">
                    <Marked parts={r.parts} />
                    {messages.length > 1 && (
                      <span class="ml-2 text-xs text-muted">
                        {messages.find((m) => m.id === r.id)?.name}
                      </span>
                    )}
                  </span>
                  <span class="font-mono text-xs break-all text-muted">
                    {r.path}
                  </span>
                </>
              ) : (
                <>
                  <span class="break-words">{r.title}</span>
                  <span class="line-clamp-1 text-xs text-muted">
                    <Marked parts={excerptParts(r.excerpt)} />
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-keyshortcuts="Control+K Meta+K"
        class="flex items-center gap-2 rounded border border-line px-3 py-1 text-sm text-fg"
      >
        {labels.open}
        <kbd class="hidden font-mono text-xs text-muted sm:inline">
          {mac ? labels.shortcutMac : labels.shortcut}
        </kbd>
      </button>
      <dialog
        ref={dialog}
        data-palette=""
        aria-labelledby={`${ids}-t`}
        // Esc closes the dialog natively; it must not also clear the Workspace selection
        onKeyDown={(e) => e.key === "Escape" && e.stopPropagation()}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        onClose={() => {
          setQuery("");
          setPages([]);
        }}
        class="m-0 mx-auto mt-[12vh] w-full max-w-xl rounded border border-line bg-bg p-0 text-fg backdrop:bg-black/50 max-sm:mt-0 max-sm:max-w-none"
      >
        <h2 id={`${ids}-t`} class="sr-only">
          {labels.title}
        </h2>
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={labels.input}
          aria-expanded={rows.length > 0}
          aria-controls={`${ids}-l`}
          aria-activedescendant={act >= 0 ? optId(act) : undefined}
          aria-autocomplete="list"
          autocomplete="off"
          spellcheck={false}
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={onKeyDown}
          class="w-full border-b border-line bg-transparent px-4 py-3 text-base outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        />
        <div
          id={`${ids}-l`}
          role="listbox"
          aria-label={labels.title}
          class="max-h-[60vh] overflow-y-auto"
        >
          {group(labels.groupElements, "el", 0)}
          {group(labels.groupPages, "page", el.hits.length)}
        </div>
        {!q && <p class="px-4 py-3 text-sm text-muted">{labels.hint}</p>}
        <div class="flex items-center justify-between gap-2 px-4 py-2 text-sm text-muted">
          <p role="status" aria-live="polite">
            {statusText}
          </p>
          {index === "error" && (
            <button
              type="button"
              onClick={loadIndex}
              class="rounded border border-line px-3 py-1 text-fg"
            >
              {labels.retry}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
