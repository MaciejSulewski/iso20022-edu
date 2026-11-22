import { useRef, useState } from "preact/hooks";

interface Tab {
  id: string;
  label: string;
  content: string;
}

// The tab buttons alone, controlled, with roving focus. Tab `id` gives `tab-<id>` and controls `panel-<id>`.
export function TabList({
  tabs,
  label,
  active,
  onChange,
  class: cls = "",
}: {
  tabs: { id: string; label: string }[];
  label: string;
  active: number;
  onChange: (i: number) => void;
  class?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent) {
    const last = tabs.length - 1;
    const next = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      class={`flex gap-1 border-b border-line ${cls}`}
    >
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={i === active}
          aria-controls={`panel-${tab.id}`}
          tabIndex={i === active ? 0 : -1}
          onClick={() => onChange(i)}
          onKeyDown={onKeyDown}
          class={`-mb-px border-b-2 px-3 py-2 text-sm ${
            i === active
              ? "border-accent font-medium text-fg"
              : "border-transparent text-muted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <TabList tabs={tabs} label={label} active={active} onChange={setActive} />
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={i !== active}
          class="py-4 text-fg"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
