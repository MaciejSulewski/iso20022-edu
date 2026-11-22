import type { ComponentChildren } from "preact";
import { useEffect, useId, useState } from "preact/hooks";
import type { TreeChild } from "../lib/schema-tree.ts";
import { parseHash } from "../lib/tree-view.ts";
import { panelNode } from "../lib/workspace.ts";
import type { Overlay, XmlNode } from "../lib/xml-tree.ts";
import { GLYPH, TONE, type Presence } from "../lib/xml-view.ts";
import AnnotatedXml, { type XmlLabels } from "./AnnotatedXml";
import ElementPanel, { type PanelLabels } from "./ElementPanel";
import SchemaTree, { type TreeLabels } from "./SchemaTree";

type Labels = {
  xml: XmlLabels;
  tree: TreeLabels;
  panel: PanelLabels;
  aside: string;
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

  useEffect(() => {
    // an unknown path is kept but matches nothing, so nothing shows as selected
    const fromHash = () => {
      const path = parseHash(location.hash);
      if (path) setSelected(path);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);

  function select(path: string | null) {
    setSelected(path);
    // replaceState: selecting does not fill the back button, and fires no hashchange
    history.replaceState(
      null,
      "",
      path ? `#${path}` : location.pathname + location.search,
    );
  }

  return (
    <div>
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
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <section aria-labelledby={xmlId} class={pane}>
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
        <section aria-labelledby={treeId} class={pane}>
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
        <aside
          aria-label={labels.aside}
          class="h-fit rounded border border-line bg-surface p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto"
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
  );
}
