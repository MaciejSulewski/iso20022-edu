import { useState } from "preact/hooks";

// Test island, remove when real islands exist.
export default function Counter({ label }: { label: string }) {
  const [n, setN] = useState(0);
  return (
    <button
      type="button"
      class="rounded bg-slate-200 px-3 py-1 dark:bg-slate-700 dark:text-white"
      onClick={() => setN(n + 1)}
    >
      {label}: {n}
    </button>
  );
}
