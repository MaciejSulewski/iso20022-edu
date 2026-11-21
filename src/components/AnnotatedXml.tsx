import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { XmlNode } from "../lib/xml-tree.ts";
import ElementPanel, { type PanelLabels } from "./ElementPanel";

type Labels = PanelLabels & {
  tree: string;
  panel: string;
  close: string;
  collapse: string; // contains {name} and {tag}
  expand: string; // contains {name} and {tag}
  count: string; // contains {n}
};

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
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { rows, all } = flatten(nodes, collapsed);
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

  // Esc on desktop clears the selection; on mobile the dialog handles Esc itself.
  function onEsc(e: KeyboardEvent) {
    if (e.key !== "Escape" || !desktop || !cur.current) return;
    setSelected(null);
    history.replaceState(null, "", location.pathname + location.search);
  }

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
    <div
      onKeyDown={onEsc}
      class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
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
          if (close)
            return (
              <div key={id + "/close"} class="flex">
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
            </div>
          );
        })}
      </div>
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
