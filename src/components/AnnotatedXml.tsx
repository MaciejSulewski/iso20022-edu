import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { XmlNode } from "../lib/xml-tree.ts";
import {
  elementState,
  isHidden,
  previewText,
  visibleRows,
  type Presence,
} from "../lib/xml-view.ts";
import ElementPanel, { type PanelLabels } from "./ElementPanel";

type Labels = PanelLabels & {
  tree: string;
  panel: string;
  close: string;
  collapse: string; // contains {name} and {tag}
  expand: string; // contains {name} and {tag}
  count: string; // contains {n}
  legend: string;
  legendNote: string;
  states: Record<Presence | "repeats", string>;
  hints: Record<Presence | "repeats", string>;
  mode: string;
  modeHint: string;
  hidden: string; // contains {n}
  hiddenOne: string;
};

// One symbol per state. Colour only reinforces it: the symbol and the words carry the meaning.
const GLYPH: Record<Presence | "repeats", string> = {
  required: "●",
  optional: "○",
  choice: "◆",
  repeats: "↻",
};
const TONE: Record<Presence | "repeats", string> = {
  required: "text-fg",
  optional: "text-muted",
  choice: "text-accent",
  repeats: "text-muted",
};
const MODE_KEY = "xml.mode";
const store = {
  get: () => {
    try {
      return localStorage.getItem(MODE_KEY);
    } catch {
      return null; // storage blocked: the mode just does not persist
    }
  },
  set: (v: string) => {
    try {
      localStorage.setItem(MODE_KEY, v);
    } catch {
      /* see get */
    }
  },
};
type Tip = { id: string; left: number; top?: number; bottom?: number };
const TIP_W = 320;

// Repeated siblings share a path, so rows are keyed by a unique id: "A/B[2]/C".
type Row = { id: string; node: XmlNode; depth: number; close?: boolean };

function flatten(
  nodes: XmlNode[],
  collapsed: Set<string>,
  parent = "",
  depth = 0,
): { rows: Row[]; all: Row[] } {
  const rows: Row[] = [];
  const all: Row[] = [];
  for (const node of nodes) {
    const id = `${parent}${parent ? "/" : ""}${node.tag}${node.repeatIndex ? `[${node.repeatIndex}]` : ""}`;
    const row = { id, node, depth };
    rows.push(row);
    all.push(row);
    const sub = flatten(node.children, collapsed, id, depth + 1);
    all.push(...sub.all);
    if (!collapsed.has(id) && node.children.length)
      rows.push(...sub.rows, { id, node, depth, close: true });
  }
  return { rows, all };
}

const attrText = (n: XmlNode) =>
  Object.entries(n.attrs ?? {}).map(([k, v]) => ` ${k}="${v}"`);

const isMobile = () => !matchMedia("(min-width: 1024px)").matches;

export default function AnnotatedXml({
  nodes,
  labels,
}: {
  nodes: XmlNode[];
  labels: Labels;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [scroll, setScroll] = useState(0); // bumps when the hash asks for a scroll
  const [desktop, setDesktop] = useState(true); // true on the server: the aside is CSS-hidden below lg
  const [sheet, setSheet] = useState(false); // mobile bottom sheet
  const [beginner, setBeginner] = useState(false); // full by default, so server and first client render match
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tipId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { rows: allRows, all } = flatten(nodes, collapsed);
  const { rows } = visibleRows(allRows, beginner);
  const { hidden } = visibleRows(all, true);
  const byId = new Map(all.map((r) => [r.id, r]));
  const cur = useRef(selected);
  cur.current = selected;
  const sel = selected ? byId.get(selected)?.node : undefined;

  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    setBeginner(store.get() === "beginner");
  }, []);

  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    addEventListener("scroll", hide, true);
    return () => removeEventListener("scroll", hide, true);
  }, [tip]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (sheet && !desktop && !d.open) d.showModal();
    if ((!sheet || desktop) && d.open) d.close();
    if (sheet && desktop) setSheet(false); // resized up: no stale modal on the way back
  }, [sheet, desktop]);

  useEffect(() => {
    const fromHash = () => {
      let path = "";
      try {
        path = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      // keep a selected repeat when the hash already names its path
      if (cur.current && byId.get(cur.current)?.node.path === path) return;
      const hit = all.find((r) => r.node.path === path);
      if (!hit) return;
      const parts = hit.id.split("/");
      setCollapsed((c) => {
        const next = new Set(c);
        parts
          .slice(0, -1)
          .forEach((_, i) => next.delete(parts.slice(0, i + 1).join("/")));
        return next;
      });
      if (isHidden(hit.id, byId)) setBeginner(false); // a link to a hidden element shows everything
      setSelected(hit.id);
      if (isMobile()) setSheet(true);
      setScroll((s) => s + 1);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);

  useEffect(() => {
    if (scroll && selected)
      document
        .querySelector(`[data-id="${CSS.escape(selected)}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [scroll]);

  function select(id: string, openSheet = true) {
    setSelected(id);
    if (openSheet && isMobile()) setSheet(true);
    // replaceState: selecting does not fill the back button, and fires no hashchange
    history.replaceState(null, "", `#${byId.get(id)!.node.path}`);
  }

  function showTip(id: string, el: HTMLElement) {
    clearTimeout(timer.current);
    if (matchMedia("(hover: none)").matches) return; // touch: the tap opens the sheet
    timer.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left, innerWidth - TIP_W - 8));
      setTip(
        r.bottom > innerHeight - 160
          ? { id, left, bottom: innerHeight - r.top + 2 }
          : { id, left, top: r.bottom + 2 },
      );
    }, 300);
  }
  const hideTip = (delay = 0) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTip(null), delay);
  };

  function setMode(next: boolean) {
    setBeginner(next);
    store.set(next ? "beginner" : "full");
    if (!next || !selected || !isHidden(selected, byId)) return;
    // the selection moves to the nearest visible ancestor, as when collapsing
    const parts = selected.split("/");
    const top = parts.findIndex(
      (_, i) =>
        elementState(byId.get(parts.slice(0, i + 1).join("/"))!.node.info)
          .presence === "optional",
    );
    if (top > 0) select(parts.slice(0, top).join("/"), false);
    else {
      setSelected(null);
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  // Esc hides a tooltip first (WCAG 1.4.13); then, on desktop, it clears the selection (on mobile the dialog
  // handles Esc). Listening on the window: focus can sit on body after a breadcrumb click.
  function onEsc(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    if (tip) {
      clearTimeout(timer.current);
      setTip(null);
      return;
    }
    if (!desktop || !cur.current) return;
    setSelected(null);
    history.replaceState(null, "", location.pathname + location.search);
  }

  const esc = useRef(onEsc);
  esc.current = onEsc;
  useEffect(() => {
    const on = (e: KeyboardEvent) => esc.current(e);
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, []);

  function toggle(id: string) {
    // a selection hidden inside a collapsing branch moves to that branch
    if (!collapsed.has(id) && selected?.startsWith(id + "/")) select(id, false);
    setCollapsed((c) => {
      const next = new Set(c);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = [
      ...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        "[data-id]",
      ),
    ];
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const next = buttons[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    e.preventDefault();
    next.focus();
    select(next.dataset.id!, false);
  }

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
        <p class="mb-3 text-sm text-muted">{labels.legendNote}</p>
        <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <button
            type="button"
            aria-pressed={beginner}
            onClick={() => setMode(!beginner)}
            class={`min-h-6 rounded border px-3 py-1 ${beginner ? "border-accent bg-accent text-accent-fg" : "border-line"}`}
          >
            {labels.mode}
          </button>
          <span class="text-muted">{labels.modeHint}</span>
          <span role="status" class="text-muted">
            {beginner && hidden > 0
              ? (hidden === 1 ? labels.hiddenOne : labels.hidden).replace(
                  "{n}",
                  String(hidden),
                )
              : ""}
          </span>
        </div>
        <div
          role="group"
          aria-label={labels.tree}
          onKeyDown={onKey}
          class="font-mono text-sm leading-6"
        >
          {rows.map(({ id, node, depth, close }) => {
            const branch = node.children.length > 0;
            const open = !collapsed.has(id);
            const on = id === selected;
            const st = elementState(node.info);
            if (close)
              return (
                <div key={id + "/close"} class="flex">
                  <span class="w-9 shrink-0" aria-hidden="true" />
                  {Array.from({ length: depth }, (_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      class="w-5 shrink-0 self-stretch border-l border-line"
                    />
                  ))}
                  <span class="ml-6 px-1 text-accent">&lt;/{node.tag}&gt;</span>
                </div>
              );
            return (
              <div
                key={id}
                class={`flex items-start ${on ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : ""}`}
              >
                {Array.from({ length: depth }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    class="w-5 shrink-0 self-stretch border-l border-line"
                  />
                ))}
                {branch ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={(open ? labels.collapse : labels.expand)
                      .replace("{name}", node.info.isoName)
                      .replace("{tag}", node.tag)}
                    onClick={() => toggle(id)}
                    class="flex size-6 shrink-0 items-center justify-center text-muted hover:text-fg"
                  >
                    <span aria-hidden="true">{open ? "▾" : "▸"}</span>
                  </button>
                ) : (
                  <span class="size-6 shrink-0" aria-hidden="true" />
                )}
                <button
                  type="button"
                  data-id={id}
                  aria-describedby={tip?.id === id ? tipId : undefined}
                  onPointerEnter={(e) =>
                    e.pointerType !== "touch" &&
                    showTip(id, e.currentTarget as HTMLElement)
                  }
                  onPointerLeave={() => hideTip(150)}
                  onFocus={(e) => showTip(id, e.currentTarget as HTMLElement)}
                  onBlur={() => hideTip()}
                  aria-current={on ? "true" : undefined}
                  onClick={() => select(id)}
                  class="min-h-6 min-w-0 flex-1 px-1 text-left break-all hover:bg-surface"
                >
                  <span class="text-accent">&lt;{node.tag}</span>
                  <span class="text-muted">{attrText(node)}</span>
                  <span class="text-accent">
                    {branch || node.value !== undefined ? ">" : "/>"}
                  </span>
                  {!branch && node.value}
                  {!branch && node.value !== undefined && (
                    <span class="text-accent">&lt;/{node.tag}&gt;</span>
                  )}
                  {branch && !open && (
                    <span class="text-muted">
                      {" "}
                      …{" "}
                      {labels.count.replace(
                        "{n}",
                        String(node.children.length),
                      )}{" "}
                      <span class="text-accent">&lt;/{node.tag}&gt;</span>
                    </span>
                  )}
                </button>
                <span class="order-first flex w-9 shrink-0 text-center">
                  <span aria-hidden="true" class={`w-4 ${TONE[st.presence]}`}>
                    {GLYPH[st.presence]}
                  </span>
                  <span aria-hidden="true" class={`w-4 ${TONE.repeats}`}>
                    {st.repeats ? GLYPH.repeats : ""}
                  </span>
                  <span class="sr-only">
                    {labels.states[st.presence]}
                    {st.repeats ? `, ${labels.states.repeats}` : ""}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {tip && byId.get(tip.id) && (
        <div
          id={tipId}
          role="tooltip"
          onPointerEnter={() => clearTimeout(timer.current)}
          onPointerLeave={() => hideTip(150)}
          style={`left:${tip.left}px;${tip.top !== undefined ? `top:${tip.top}px` : `bottom:${tip.bottom}px`}`}
          class="fixed z-10 w-80 max-w-[calc(100vw-1rem)] rounded border border-line bg-bg p-3 font-sans text-sm leading-5 text-fg shadow-lg"
        >
          <TipBody node={byId.get(tip.id)!.node} labels={labels} />
        </div>
      )}
      {desktop && (
        <aside
          aria-label={labels.panel}
          class="hidden h-fit max-h-[calc(100vh-2rem)] overflow-y-auto rounded border border-line bg-surface p-4 lg:sticky lg:top-4 lg:block"
        >
          <ElementPanel
            id={selected}
            node={sel}
            labels={labels}
            titleId={titleId}
            onSelect={(id) => select(id, false)}
          />
        </aside>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setSheet(false);
          // the browser returns focus to the opener; deep links have none, so do it here
          if (cur.current)
            document
              .querySelector<HTMLElement>(
                `[data-id="${CSS.escape(cur.current)}"]`,
              )
              ?.focus();
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
            <ElementPanel
              id={selected}
              node={sel}
              labels={labels}
              titleId={titleId}
              onSelect={(id) => select(id, false)}
            />
          </>
        )}
      </dialog>
    </div>
  );
}

function TipBody({ node, labels }: { node: XmlNode; labels: Labels }) {
  const st = elementState(node.info);
  return (
    <>
      <p class="font-semibold">{node.info.isoName}</p>
      <p class="text-muted">
        {labels.states[st.presence]}
        {st.repeats ? `, ${labels.states.repeats}` : ""}
      </p>
      <p class="mt-1">{previewText(node.info)}</p>
    </>
  );
}
