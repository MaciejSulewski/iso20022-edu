// Pure FlowPlayer logic: the `#<variant>/<n>` deep link (n one-based) and step bounds.

/** Zero-based step; anything invalid falls back to step 0, of the first variant if the variant is unknown. */
export function parseHash(
  hash: string,
  variantIds: string[],
  stepCount: (variantId: string) => number,
): { variant: string; step: number } {
  const [v = "", n = ""] = hash.replace(/^#/, "").split("/");
  if (!variantIds.includes(v)) return { variant: variantIds[0]!, step: 0 };
  const step = /^\d+$/.test(n) ? Number(n) - 1 : -1;
  return { variant: v, step: step >= 0 && step < stepCount(v) ? step : 0 };
}

export function toHash(variant: string, step: number): string {
  return `#${variant}/${step + 1}`;
}

export function clampStep(step: number, count: number): number {
  return Math.min(Math.max(step, 0), count - 1);
}
