import { useEffect, useState } from "preact/hooks";
import type { z } from "zod";
import type { FlowSchema } from "../lib/content-schemas";
import { clampStep, parseHash, toHash } from "../lib/flow";
import { TabList } from "./ui/Tabs";

type Flow = z.infer<typeof FlowSchema>;

export interface FlowLabels {
  variants: string;
  diagram: string;
  steps: string;
  sender: string;
  receiver: string;
  stepOf: string;
  prev: string;
  next: string;
  message: string;
  settlement: string;
  elements: string;
  sample: string;
  /** "{from}" and "{to}" are replaced by roles. */
  hop: string;
}

const btn =
  "rounded border border-line bg-bg px-4 py-2 text-sm font-medium aria-disabled:cursor-not-allowed aria-disabled:text-muted aria-disabled:opacity-60";

export default function FlowPlayer({
  participants,
  variants,
  labels,
  codes,
  elementBase,
  sample,
}: {
  participants: Flow["participants"];
  variants: Flow["variants"];
  labels: FlowLabels;
  /** SettlementMethod1Code wording from the overlay, code to text. */
  codes: Record<string, string>;
  /** Element links are `${elementBase}#<path>`. */
  elementBase: string;
  /** The step that is the sample message, and its page. */
  sample: { href: string; variant: string; step: number };
}) {
  // the first render is fixed (server and client agree); the hash is read after mount
  const [vi, setVi] = useState(0);
  const [step, setStep] = useState(0);
  const variant = variants[vi]!;
  const steps = variant.steps;
  const current = steps[step]!;
  const last = steps.length - 1;
  const ids = variants.map((v) => v.id);

  useEffect(() => {
    const h = parseHash(
      location.hash,
      ids,
      (id) => variants.find((v) => v.id === id)!.steps.length,
    );
    setVi(ids.indexOf(h.variant as Flow["variants"][number]["id"]));
    setStep(h.step);
  }, []);

  function go(v: number, s: number) {
    const n = clampStep(s, variants[v]!.steps.length);
    setVi(v);
    setStep(n);
    history.replaceState(null, "", toHash(variants[v]!.id, n));
  }

  const col = (id: string) => participants.findIndex((p) => p.id === id);
  const from = col(current.from);
  const to = col(current.to);
  const role = (i: number) =>
    [i === from && labels.sender, i === to && labels.receiver]
      .filter(Boolean)
      .join(", ");
  const span = {
    gridColumnStart: Math.min(from, to) + 1,
    gridColumnEnd: Math.max(from, to) + 2,
  };

  return (
    <div>
      <TabList
        tabs={variants.map((v) => ({ id: `flow-${v.id}`, label: v.title }))}
        label={labels.variants}
        active={vi}
        onChange={(i) => go(i, 0)}
      />
      <div
        role="tabpanel"
        id={`panel-flow-${variant.id}`}
        aria-labelledby={`tab-flow-${variant.id}`}
        class="pt-4"
      >
        <p class="max-w-[65ch]">{variant.intro}</p>
        {variant.notice && (
          <p class="mt-4 max-w-[65ch] rounded border border-line border-l-4 border-l-accent bg-surface p-3 text-sm">
            {variant.notice}
          </p>
        )}

        <div class="relative isolate mt-6 hidden md:block">
          {/* the chain: one rail behind every card */}
          <div
            aria-hidden="true"
            class="absolute inset-x-0 top-10 -z-10 border-t border-line"
          />
          <ol
            aria-label={labels.diagram}
            class="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))`,
            }}
          >
            {participants.map((p, i) => {
              const r = role(i);
              return (
                <li
                  key={p.id}
                  data-participant={p.id}
                  data-role={r || undefined}
                  class={`flex flex-col rounded border bg-bg p-3 ${
                    r ? "border-accent ring-1 ring-accent" : "border-line"
                  }`}
                >
                  <span class="text-sm font-semibold">{p.role}</span>
                  <span class="mt-0.5 text-sm break-words text-muted">
                    {p.who}
                  </span>
                  <span
                    class={`mt-2 self-start rounded px-1.5 py-0.5 text-xs font-medium ${
                      r ? "bg-accent text-accent-fg" : "invisible"
                    }`}
                  >
                    {r || labels.sender}
                  </span>
                </li>
              );
            })}
          </ol>
          {/* the hop: a bar from the sender's column to the receiver's, with what travels on it */}
          <div
            aria-hidden="true"
            class="mt-2 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))`,
            }}
          >
            <div style={span} class="flex flex-col items-center px-[10%]">
              <div
                class={`flex w-full items-center ${from > to ? "flex-row-reverse" : ""}`}
              >
                <span class="size-2 shrink-0 rounded-full bg-accent" />
                <span class="h-0.5 flex-1 bg-accent" />
                <svg
                  viewBox="0 0 8 10"
                  class={`h-2.5 w-2 shrink-0 fill-accent ${from > to ? "rotate-180" : ""}`}
                >
                  <path d="M0 0 8 5 0 10z" />
                </svg>
              </div>
              {current.message && (
                <span class="mt-1 font-mono text-sm">{current.message}</span>
              )}
            </div>
          </div>
        </div>

        <ol aria-label={labels.steps} class="mt-6 space-y-1 md:hidden">
          {steps.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                aria-current={i === step ? "step" : undefined}
                onClick={() => go(vi, i)}
                class="flex w-full gap-2 rounded border-l-4 border-transparent px-3 py-2 text-left text-sm aria-[current=step]:border-accent aria-[current=step]:bg-surface aria-[current=step]:font-semibold"
              >
                <span class="text-muted tabular-nums">{`${i + 1}.`}</span>
                <span>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div class="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            class={btn}
            aria-disabled={step === 0 ? "true" : undefined}
            onClick={() => step > 0 && go(vi, step - 1)}
          >
            {labels.prev}
          </button>
          <span class="text-sm text-muted tabular-nums">
            {labels.stepOf
              .replace("{n}", String(step + 1))
              .replace("{total}", String(steps.length))}
          </span>
          <button
            type="button"
            class={btn}
            aria-disabled={step === last ? "true" : undefined}
            onClick={() => step < last && go(vi, step + 1)}
          >
            {labels.next}
          </button>
        </div>

        <section
          aria-live="polite"
          data-flow-detail
          class="mt-4 rounded border border-line bg-surface p-4"
        >
          <h2 class="text-lg font-semibold">{current.title}</h2>
          <p class="mt-1 text-sm text-muted">
            {labels.hop
              .replace("{from}", participants[from]!.role)
              .replace("{to}", participants[to]!.role)}
          </p>
          <p class="mt-3 max-w-[65ch]">{current.text}</p>
          <dl class="mt-4 space-y-3 text-sm">
            {current.message && (
              <div>
                <dt class="font-semibold">{labels.message}</dt>
                <dd class="mt-0.5 font-mono">{current.message}</dd>
              </div>
            )}
            {current.settlement && (
              <div>
                <dt class="font-semibold">{labels.settlement}</dt>
                <dd class="mt-0.5">
                  <span class="font-mono font-semibold">
                    {current.settlement}
                  </span>
                  {codes[current.settlement] &&
                    `: ${codes[current.settlement]}`}
                </dd>
              </div>
            )}
            {current.elements.length > 0 && (
              <div>
                <dt class="font-semibold">{labels.elements}</dt>
                <dd class="mt-1">
                  <ul class="flex flex-wrap gap-2">
                    {current.elements.map((path) => (
                      <li key={path}>
                        <a
                          href={`${elementBase}#${path}`}
                          class="inline-block rounded border border-line bg-bg px-2 py-1 font-mono break-all"
                        >
                          {path}
                        </a>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
          {variant.id === sample.variant && step === sample.step && (
            <p class="mt-4 text-sm">
              <a href={sample.href}>{labels.sample}</a>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
