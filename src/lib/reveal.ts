// Scrolls `el` into view inside its own scrolling workspace pane ([data-pane]) without moving the window,
// like scrollIntoView({ block: "nearest" }). The target box is the part of the pane on screen (a sticky pane
// can run past the fold). A pane that does not scroll (stacked layout) falls back to the window; inside a
// hidden pane both do nothing.
export function reveal(el: Element | null | undefined) {
  if (!el) return;
  const pane = el.closest<HTMLElement>("[data-pane]");
  if (!pane || pane.scrollHeight <= pane.clientHeight) {
    el.scrollIntoView({ block: "nearest" });
    return;
  }
  const r = el.getBoundingClientRect();
  const p = pane.getBoundingClientRect();
  const top = Math.max(p.top, 0);
  const bottom = Math.min(p.bottom, innerHeight);
  if (r.top < top) pane.scrollTop += r.top - top;
  else if (r.bottom > bottom)
    pane.scrollTop += Math.min(r.bottom - bottom, r.top - top);
}
