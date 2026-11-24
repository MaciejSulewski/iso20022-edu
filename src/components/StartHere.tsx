import { useEffect, useState } from "preact/hooks";

export type Step = {
  id: string;
  title: string;
  desc: string;
  href: string;
  lessonHref?: string | undefined;
  lessonTitle?: string | undefined;
};
type Labels = {
  progress: string; // contains {done} and {total}
  done: string;
  open: string;
  lesson: string; // contains {title}
};

const KEY = "progress.start-here";

function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function StartHere({
  steps,
  labels,
}: {
  steps: Step[];
  labels: Labels;
}) {
  const [done, setDone] = useState<string[]>([]);
  // read after mount so server and first client render match
  useEffect(() => setDone(load()), []);

  function toggle(id: string) {
    const next = done.includes(id)
      ? done.filter((d) => d !== id)
      : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage blocked: progress lasts for this page only
    }
  }

  const count = steps.filter((s) => done.includes(s.id)).length;
  return (
    <div>
      <p role="status" class="mb-3 text-sm font-medium">
        {labels.progress
          .replace("{done}", String(count))
          .replace("{total}", String(steps.length))}
      </p>
      <div
        aria-hidden="true"
        class="mb-6 h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          class="h-full bg-accent"
          style={{ width: `${(count / steps.length) * 100}%` }}
        />
      </div>
      <ol class="grid gap-3">
        {steps.map((s, i) => {
          const checked = done.includes(s.id);
          return (
            <li
              key={s.id}
              class="flex items-start gap-3 rounded border border-line p-3"
            >
              <input
                id={`step-${s.id}`}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(s.id)}
                class="mt-1 size-5 shrink-0 accent-accent"
              />
              <div class="min-w-0 flex-1">
                <label for={`step-${s.id}`} class="block font-medium">
                  {/* one text node: "{i + 1}." makes two, and hydration doubles the dot */}
                  <span class="mr-2 text-muted">{`${i + 1}.`}</span>
                  <span class={checked ? "line-through" : ""}>{s.title}</span>
                  {checked && (
                    <span class="ml-2 text-sm text-muted">({labels.done})</span>
                  )}
                </label>
                <p class="mt-1 text-sm text-muted">{s.desc}</p>
                {/* step 1's tool is its lesson: one link, not two */}
                {s.lessonHref && s.lessonHref !== s.href && (
                  <a href={s.lessonHref} class="mt-1 mr-4 inline-block text-sm">
                    {labels.lesson.replace("{title}", s.lessonTitle ?? "")}
                  </a>
                )}
                <a href={s.href} class="mt-1 inline-block text-sm">
                  {labels.open}
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
