import type { XmlNode } from "../lib/xml-tree.ts";

export type PanelLabels = Record<
  | "empty"
  | "path"
  | "explanation"
  | "none"
  | "iso"
  | "facts"
  | "type"
  | "use"
  | "reqOnce"
  | "optOnce"
  | "reqMany"
  | "optMany"
  | "upTo"
  | "atLeast"
  | "choiceMember"
  | "choice"
  | "codes"
  | "codeExplained"
  | "examples"
  | "notes",
  string
>;

const h = "mb-1 text-sm font-semibold text-muted";

function occurrence(i: XmlNode["info"], l: PanelLabels) {
  if (i.max === 1) return i.min >= 1 ? l.reqOnce : l.optOnce;
  const base = i.min >= 1 ? l.reqMany : l.optMany;
  return [
    base,
    i.min > 1 && l.atLeast.replace("{n}", String(i.min)),
    i.max !== "unbounded" && l.upTo.replace("{n}", String(i.max)),
  ]
    .filter(Boolean)
    .join(", ");
}

// The breadcrumb repeats the XML view: one ancestor per line, indented by depth,
// the current element carrying the same accent bar as the selected XML row.
function Path({
  id,
  labels,
  onSelect,
}: {
  id: string;
  labels: PanelLabels;
  onSelect: (id: string) => void;
}) {
  const parts = id.split("/");
  return (
    <nav aria-label={labels.path} class="mb-4 font-mono text-sm">
      <ol>
        {parts.map((part, i) => {
          const last = i === parts.length - 1;
          const to = parts.slice(0, i + 1).join("/");
          return (
            <li
              key={to}
              style={{ paddingLeft: `${i * 1.25}rem` }}
              class={
                last ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : ""
              }
            >
              <button
                type="button"
                aria-current={last ? "location" : undefined}
                disabled={last}
                onClick={() => onSelect(to)}
                class={`min-h-6 px-1 text-left break-all ${last ? "font-semibold text-fg" : "text-accent underline underline-offset-2"}`}
              >
                &lt;{part.replace(/\[\d+\]$/, "")}&gt;
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function ElementPanel({
  id,
  node,
  labels,
  titleId,
  onSelect,
}: {
  id: string | null;
  node: XmlNode | undefined;
  labels: PanelLabels;
  titleId: string;
  onSelect: (id: string) => void;
}) {
  const i = node?.info;
  return (
    <div>
      {/* always mounted, so screen readers announce each new selection */}
      <div aria-live="polite">
        {i ? (
          <h2 id={titleId} class="mb-3 text-xl font-semibold break-words">
            {i.isoName}
          </h2>
        ) : (
          <p id={titleId} class="text-muted">
            {labels.empty}
          </p>
        )}
      </div>
      {i && id && (
        <>
          <Path id={id} labels={labels} onSelect={onSelect} />
          {i.explanation ? (
            <section class="mb-4">
              <h3 class={h}>{labels.explanation}</h3>
              <p>{i.explanation}</p>
            </section>
          ) : (
            <p class="mb-4 text-muted italic">{labels.none}</p>
          )}
          <section class="mb-4 border-l-2 border-muted pl-3">
            <h3 class={h}>{labels.iso}</h3>
            <p class="text-sm">{i.definition}</p>
          </section>
          <section class="mb-4">
            <h3 class={h}>{labels.facts}</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt class="text-muted">{labels.type}</dt>
              <dd class="font-mono break-all">{i.typeName}</dd>
              <dt class="text-muted">{labels.use}</dt>
              <dd>{occurrence(i, labels)}</dd>
            </dl>
            {i.choiceMember && (
              <p class="mt-2 text-sm">{labels.choiceMember}</p>
            )}
            {i.choice && <p class="mt-2 text-sm">{labels.choice}</p>}
          </section>
          {i.codes && i.codes.length > 0 && (
            <section class="mb-4">
              <h3 class={h}>{labels.codes}</h3>
              <ul class="space-y-1 text-sm">
                {i.codes.map((c) => (
                  <li key={c.code}>
                    <code class="font-semibold">{c.code}</code>
                    {c.name && <span> {c.name}</span>}
                    {c.definition && (
                      <span class="block text-muted">{c.definition}</span>
                    )}
                    {c.explanation && (
                      <span class="block">
                        <span class="font-semibold">
                          {labels.codeExplained}
                        </span>{" "}
                        {c.explanation}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {i.examples && i.examples.length > 0 && (
            <section class="mb-4">
              <h3 class={h}>{labels.examples}</h3>
              <ul class="font-mono text-sm break-all">
                {i.examples.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          )}
          {i.notes && (
            <section>
              <h3 class={h}>{labels.notes}</h3>
              <p class="text-sm">{i.notes}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
