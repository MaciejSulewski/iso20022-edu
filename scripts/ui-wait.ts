// Shared by the browser checks: wait for a state to settle before reading it.
import type { Page } from "playwright";

const frame = (p: Page) =>
  p.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
const brief = (s: string) => (s.length > 600 ? `${s.slice(0, 600)}...` : s);

// Runs `read` in the page until `ok` accepts what it returns on two readings one animation frame apart that
// also agree with each other, and returns that value. Bounded (5 s): on timeout, or when `read` throws in the
// page, it throws an error that starts with `what` and gives the last value read.
// `read` runs in the page, so it cannot use variables of the caller: pass them as `arg`.
export async function settled<T, A = undefined>(
  p: Page,
  what: string,
  read: (arg: A) => T | Promise<T>,
  ok: (v: T) => boolean,
  arg?: A,
  ms = 5000,
): Promise<T> {
  const end = Date.now() + ms;
  let prev: string | undefined;
  for (;;) {
    let v: T;
    try {
      v = (await p.evaluate(read as (a: unknown) => T, arg)) as T;
    } catch (e) {
      throw new Error(
        `${what}: reading the page failed: ${brief(String(e).split("\n")[0]!)}`,
        { cause: e },
      );
    }
    const key = JSON.stringify(v) ?? "undefined";
    const good = ok(v);
    if (good && key === prev) return v;
    prev = good ? key : undefined;
    if (Date.now() > end)
      throw new Error(
        `${what}: not settled within ${ms} ms, last read ${brief(key)}`,
      );
    await frame(p);
  }
}

// UI_CPU_RATE=4 slows the page's CPU four times (Chrome DevTools throttling), to try the checks on a slow runner.
export async function throttle(p: Page) {
  const rate = Number(process.env.UI_CPU_RATE ?? 1);
  if (rate <= 1) return;
  const s = await p.context().newCDPSession(p);
  await s.send("Emulation.setCPUThrottlingRate", { rate });
}

// `const settle = verifying(check)`: a `settled` that reports the check. It prints `ok <what>` when the state
// settles. When it does not, it prints `FAIL <what>: <last read>` through `check` (which counts it, so the
// script still exits non-zero) and returns undefined, so the next check still runs.
export const verifying =
  (check: (ok: boolean, what: string) => void) =>
  async <T, A = undefined>(
    p: Page,
    what: string,
    read: (arg: A) => T | Promise<T>,
    ok: (v: T) => boolean,
    arg?: A,
  ): Promise<T | undefined> => {
    try {
      const v = await settled(p, what, read, ok, arg);
      check(true, what);
      return v;
    } catch (e) {
      check(false, (e as Error).message);
      return undefined;
    }
  };

// Reads for `settled`: they run in the page, so each is self-contained.
export const selectedTab = () =>
  document.querySelector("[role=tab][aria-selected=true]")?.textContent ?? "";
export const count = (q: string) => document.querySelectorAll(q).length;
export const shown = (q: string) =>
  (document.querySelector(q) as HTMLElement | null)?.checkVisibility() ?? false;
