import type { ComponentChildren } from "preact";
import { useId, useRef } from "preact/hooks";

interface Props {
  openLabel: string;
  closeLabel: string;
  title: string;
  children?: ComponentChildren;
}

// Native modal <dialog>: dialog semantics, focus trap, Esc to close and focus return come from the browser.
export default function Sheet({
  openLabel,
  closeLabel,
  title,
  children,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const btn = "rounded border px-4 py-2 text-sm font-medium";
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        class={`${btn} border-line bg-bg text-fg`}
      >
        {openLabel}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        class="m-0 ml-auto h-full max-h-none w-80 max-w-full border-l border-line bg-bg p-4 text-fg backdrop:bg-black/50"
      >
        <h2 id={titleId} class="mb-2 text-lg font-semibold">
          {title}
        </h2>
        <div class="mb-4">{children}</div>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          class={`${btn} border-accent bg-accent text-accent-fg`}
        >
          {closeLabel}
        </button>
      </dialog>
    </>
  );
}
