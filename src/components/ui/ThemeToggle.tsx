import { useEffect, useState } from "preact/hooks";

export default function ThemeToggle({ label }: { label: string }) {
  const [dark, setDark] = useState(false);
  useEffect(
    () => setDark(document.documentElement.classList.contains("dark")),
    [],
  );

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // storage blocked: the choice just lasts for this page
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={toggle}
      class="rounded border border-line px-3 py-1 text-sm text-fg"
    >
      {label}
    </button>
  );
}
