import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { XmlNode } from "../lib/xml-tree.ts";
import {
  elementState,
  GLYPH,
  isHidden,
  previewText,
  TONE,
  visibleRows,
  type Presence,
} from "../lib/xml-view.ts";
import { reveal } from "../lib/reveal.ts";
import { rowKey, shownRow } from "../lib/workspace.ts";

export type XmlLabels = {
  tree: string;
  collapse: string; // contains {name} and {tag}
  expand: string; // contains {name} and {tag}
  count: string; // contains {n}
  states: Record<Presence | "repeats", string>;
  mode: string;
  modeHint: string;
  hidden: string; // contains {n}
  hiddenOne: string;
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
    const id = rowKey(parent, node);
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

// Controlled by `selected` (a path). Repeats share a path, so the view keeps its own row id:
// it marks the first row with the path, or keeps its current row when that already has it.
export default function AnnotatedXml({
  nodes,
  labels,
  selected,
  onSelect,
}: {
  nodes: XmlNode[];
  labels: XmlLabels;
  selected: string | null;
  onSelect: (path: string | null, pick?: boolean) => void; // pick: the user chose it (click, Enter), not moved to it
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [rowId, setRowId] = useState<string | null>(null);
  const [scroll, setScroll] = useState(0); // bumps when a selection from elsewhere asks for a scroll
  const [beginner, setBeginner] = useState(false); // full by default, so server and first client render match
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef(false); // a tooltip is waiting for its show delay
  const tipId = useId();
  const { rows: allRows, all } = flatten(nodes, collapsed);
  const { rows } = visibleRows(allRows, beginner);
  const { hidden } = visibleRows(all, true);
  const byId = new Map(all.map((r) => [r.id, r]));
  const shown = shownRow(all, rowId, selected);

  useEffect(() => {
    setBeginner(store.get() === "beginner");
  }, []);

  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    addEventListener("scroll", hide, true);
    return () => removeEventListener("scroll", hide, true);
  }, [tip]);

  // a selection from another pane or the hash: open its branch, leave beginner mode if it hides it, scroll to it
  useEffect(() => {
    if (!shown) {
      setRowId(null); // the selection left this pane: coming back must open, unhide and scroll again
      return;
    }
    if (shown === rowId) return;
    const parts = shown.split("/");
    setCollapsed((c) => {
      const next = new Set(c);
      parts
        .slice(0, -1)
        .forEach((_, i) => next.delete(parts.slice(0, i + 1).join("/")));
      return next;
    });
    if (isHidden(shown, byId)) setBeginner(false);
    setRowId(shown);
    setScroll((s) => s + 1);
  }, [shown]);

  useEffect(() => {
    if (scroll && shown)
      reveal(document.querySelector(`[data-id="${CSS.escape(shown)}"]`));
  }, [scroll]);

  function select(id: string, pick = false) {
    setRowId(id);
    onSelect(byId.get(id)!.node.path, pick);
  }

  function showTip(id: string, el: HTMLElement) {
    clearTimeout(timer.current);
    pending.current = false;
    if (matchMedia("(hover: none)").matches) return; // touch: the tap selects, no hover preview
    pending.current = true;
    timer.current = setTimeout(() => {
      pending.current = false;
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
    pending.current = false;
    timer.current = setTimeout(() => setTip(null), delay);
  };

  function setMode(next: boolean) {
    setBeginner(next);
    store.set(next ? "beginner" : "full");
    if (!next || !shown || !isHidden(shown, byId)) return;
    // the selection moves to the nearest visible ancestor, as when collapsing
    const parts = shown.split("/");
    const top = parts.findIndex(
      (_, i) =>
        elementState(byId.get(parts.slice(0, i + 1).join("/"))!.node.info)
          .presence === "optional",
    );
    if (top > 0) select(parts.slice(0, top).join("/"));
    else onSelect(null);
  }

  // Esc hides a pending or visible tooltip first (WCAG 1.4.13) and consumes the key, so the
  // workspace's Esc (clear the selection) does not also fire. This listener registers first.
  function onEsc(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    if (e.defaultPrevented) return;
    const had = tip || pending.current;
    clearTimeout(timer.current);
    pending.current = false;
    setTip(null);
    if (had) e.preventDefault();
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
    if (!collapsed.has(id) && shown?.startsWith(id + "/")) select(id);
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
    select(next.dataset.id!);
  }

  return (
    <div class="min-w-0">
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
          const on = id === shown;
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
                aria-describedby={`${tipId}-${id}${tip?.id === id ? ` ${tipId}` : ""}`}
                onPointerEnter={(e) =>
                  e.pointerType !== "touch" &&
                  showTip(id, e.currentTarget as HTMLElement)
                }
                onPointerLeave={() => hideTip(150)}
                onFocus={(e) => showTip(id, e.currentTarget as HTMLElement)}
                onBlur={() => hideTip()}
                aria-current={on ? "true" : undefined}
                onClick={() => select(id, true)}
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
                <span class="sr-only" id={`${tipId}-${id}`}>
                  {labels.states[st.presence]}
                  {st.repeats ? `, ${labels.states.repeats}` : ""}
                </span>
              </span>
            </div>
          );
        })}
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
    </div>
  );
}

function TipBody({ node, labels }: { node: XmlNode; labels: XmlLabels }) {
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
