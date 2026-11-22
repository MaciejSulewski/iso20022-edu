import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { TreeChild } from "../lib/schema-tree.ts";
import { parseHash } from "../lib/tree-view.ts";
import { reveal } from "../lib/reveal.ts";
import { panelNode } from "../lib/workspace.ts";
import type { Overlay, XmlNode } from "../lib/xml-tree.ts";
import { GLYPH, TONE, type Presence } from "../lib/xml-view.ts";
import AnnotatedXml, { type XmlLabels } from "./AnnotatedXml";
import ElementPanel, { type PanelLabels } from "./ElementPanel";
import SchemaTree, { type TreeLabels } from "./SchemaTree";
import { TabList } from "./ui/Tabs";

type Labels = {
  xml: XmlLabels;
  tree: TreeLabels;
  panel: PanelLabels;
  aside: string;
  tabs: string;
  tab: { xml: string; tree: string; details: string };
  resizeXmlTree: string;
  resizeTreeDetails: string;
  xmlTitle: string;
  treeTitle: string;
  treeLead: string;
  legend: string;
  legendNote: string;
  states: Record<Presence | "repeats", string>;
  hints: Record<Presence | "repeats", string>;
};

const pane =
  "min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto";
const WIDE = "(min-width: 80rem)"; // Tailwind xl: three columns; below it, tabs
const TABS = ["ws-xml", "ws-tree", "ws-details"] as const;
const DETAILS = 2;
const MIN = 20; // smallest pane, in percent of the workspace width
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(v)));

// One island for the sample XML, the schema tree and the details panel (ADR-014):
// it alone owns the selected path, the #path hash and the panel.
export default function Workspace({
  nodes,
  id,
  base,
  rootType,
  root,
  overlay,
  labels,
  children,
}: {
  nodes: XmlNode[];
  id: string;
  base: string;
  rootType: string;
  root: TreeChild[];
  overlay?: Overlay | undefined;
  labels: Labels;
  children?: ComponentChildren; // the constraints list, rendered under the tree
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [record, setRecord] = useState<XmlNode>();
  const titleId = useId();
  const xmlId = useId();
  const treeId = useId();
  const node = panelNode(nodes, selected, record);
  const box = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false); // ARIA only: the layout itself switches in CSS, so nothing flashes
  const [tab, setTab] = useState(0);
  const toDetails = useRef(false); // a pick just opened Details: move focus there after the render
  const [a, setA] = useState(36); // separator positions, percent of the workspace width
  const [b, setB] = useState(72);

  useEffect(() => {
    const mq = matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // The picked row's pane is now hidden, so focus goes to the Details tab, and the panel is scrolled into view
  // under the sticky tab bar.
  // no deps: the flag is cleared after every render, so a stale one never fires later
  useEffect(() => {
    if (!toDetails.current) return;
    toDetails.current = false;
    if (tab !== DETAILS) return;
    const t = document.getElementById(`tab-${TABS[DETAILS]}`);
    const top = grid.current!.getBoundingClientRect().top;
    const bar = t?.parentElement?.offsetHeight ?? 0;
    if (top < bar) scrollBy(0, top - bar);
    t?.focus({ preventScroll: true });
  });

  // Opening the XML or Tree tab shows its selected row: the selection may have moved while the pane was hidden.
  useEffect(() => {
    if (tab === DETAILS) return;
    reveal(
      document
        .getElementById(`panel-${TABS[tab]}`)
        ?.querySelector(
          "[aria-current='true'], [role=treeitem][aria-selected='true']",
        ),
    );
  }, [tab]);

  useEffect(() => {
    // an unknown path is kept but matches nothing, so nothing shows as selected
    const fromHash = () => {
      const path = parseHash(location.hash);
      if (!path) return;
      setSelected(path);
      setTab(DETAILS); // below 1280px a link opens on the details
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);

  // Esc clears the selection from anywhere in the workspace, or from body (after a breadcrumb click).
  // Not while typing in a field, nor when a widget already used the key (the XML tooltip).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const a = document.activeElement;
      if (
        a === document.body ||
        (box.current?.contains(a) && !(a instanceof HTMLInputElement))
      )
        select(null);
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, []);

  // Esc (path null) leaves the active tab alone; a pick in the XML or tree pane opens Details below 1280px.
  function select(path: string | null, pick = false) {
    setSelected(path);
    if (pick && !matchMedia(WIDE).matches) {
      toDetails.current = true;
      setTab(DETAILS);
    }
    // replaceState: selecting does not fill the back button, and fires no hashchange
    history.replaceState(
      null,
      "",
      path ? `#${path}` : location.pathname + location.search,
    );
  }

  // below 1280px the panes are tab panels; at 1280px and up they are plain columns
  const panel = (i: number) => ({
    id: `panel-${TABS[i]}`,
    role: wide ? undefined : ("tabpanel" as const),
    "aria-labelledby": wide ? undefined : `tab-${TABS[i]}`,
  });
  const hide = (i: number) => (i === tab ? "" : "max-xl:hidden");

  return (
    <div ref={box}>
      <dl
        aria-label={labels.legend}
        class="mb-1 grid gap-x-6 gap-y-1 rounded border border-line bg-surface p-3 text-sm sm:grid-cols-2 xl:grid-cols-4"
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
      <p class="mb-6 text-sm text-muted">{labels.legendNote}</p>
      <TabList
        tabs={TABS.map((id, i) => ({
          id,
          label: [labels.tab.xml, labels.tab.tree, labels.tab.details][i]!,
        }))}
        label={labels.tabs}
        active={tab}
        onChange={setTab}
        class="sticky top-0 z-10 mb-4 bg-bg xl:hidden"
      />
      <div
        ref={grid}
        class="xl:grid xl:grid-cols-(--cols)"
        style={{
          "--cols": `calc(${a}% - 12px) 24px calc(${b - a}% - 24px) 24px calc(${100 - b}% - 12px)`,
        }}
      >
        <div {...panel(0)} data-pane class={`${pane} ${hide(0)}`}>
          <section aria-labelledby={xmlId}>
            <h2 id={xmlId} class="mb-3 text-xl font-semibold">
              {labels.xmlTitle}
            </h2>
            <AnnotatedXml
              nodes={nodes}
              labels={labels.xml}
              selected={selected}
              onSelect={select}
            />
          </section>
        </div>
        <Separator
          label={labels.resizeXmlTree}
          value={a}
          min={MIN}
          max={b - MIN}
          onChange={(v) => setA(clamp(v, MIN, b - MIN))}
          grid={grid}
        />
        <div {...panel(1)} data-pane class={`${pane} ${hide(1)}`}>
          <section aria-labelledby={treeId}>
            <h2 id={treeId} class="mb-1 text-xl font-semibold">
              {labels.treeTitle}
            </h2>
            <p class="mb-3 text-sm text-muted">{labels.treeLead}</p>
            <SchemaTree
              id={id}
              base={base}
              rootType={rootType}
              root={root}
              overlay={overlay}
              labels={labels.tree}
              selected={selected}
              onSelect={select}
              onRecord={setRecord}
            />
            {children}
          </section>
        </div>
        <Separator
          label={labels.resizeTreeDetails}
          value={b}
          min={a + MIN}
          max={100 - MIN}
          onChange={(v) => setB(clamp(v, a + MIN, 100 - MIN))}
          grid={grid}
        />
        <div {...panel(DETAILS)} class={`${pane} ${hide(DETAILS)}`}>
          <aside
            aria-label={labels.aside}
            class="h-fit rounded border border-line bg-surface p-4"
          >
            <ElementPanel
              id={node ? selected : null}
              node={node}
              labels={labels.panel}
              titleId={titleId}
              onSelect={select}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

// A vertical splitter between two panes. Its value is its position in percent of the workspace width:
// arrows move 2 (Shift: 10), Home and End go to the limits, and it can be dragged.
function Separator({
  label,
  value,
  min,
  max,
  onChange,
  grid,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  grid: { current: HTMLDivElement | null };
}) {
  function onKey(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    const next = {
      ArrowLeft: value - step,
      ArrowRight: value + step,
      Home: min,
      End: max,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(next);
  }
  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault(); // no text selection or native drag from the press
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    document.body.classList.add("select-none");
    el.onpointermove = (m) => {
      const r = grid.current!.getBoundingClientRect();
      onChange(((m.clientX - r.left) / r.width) * 100);
    };
    // release, or capture lost (pointercancel, a touch taken over by the browser): stop dragging
    el.onpointerup = el.onlostpointercapture = () => {
      el.onpointermove = null;
      document.body.classList.remove("select-none");
    };
  }
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={onDown}
      class="group hidden cursor-col-resize touch-none justify-center xl:sticky xl:top-4 xl:flex xl:h-[calc(100vh-2rem)]"
    >
      <span class="w-px bg-line group-hover:w-0.5 group-hover:bg-accent group-focus-visible:w-0.5 group-focus-visible:bg-accent" />
    </div>
  );
}
