// Scrolls `el` into view inside its own scrolling workspace pane ([data-pane]) without moving the window,
// like scrollIntoView({ block: "nearest" }). A pane that does not scroll (stacked layout) falls back to the
// window; inside a hidden pane both do nothing.
export function reveal(el: Element | null | undefined) {
  if (!el) return;
  const pane = el.closest<HTMLElement>("[data-pane]");
  if (!pane || pane.scrollHeight <= pane.clientHeight) {
    el.scrollIntoView({ block: "nearest" });
    return;
  }
  const r = el.getBoundingClientRect();
  const p = pane.getBoundingClientRect();
  if (r.top < p.top) pane.scrollTop += r.top - p.top;
  else if (r.bottom > p.bottom)
    pane.scrollTop += Math.min(r.bottom - p.bottom, r.top - p.top);
}
