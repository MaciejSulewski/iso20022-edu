// Browser check for the flow page: stepping, roles, settlement and message text, links, hash, variants, 390px, palette.
// Needs a built dist (npm run build, which also runs Pagefind).
import { chromium, type Page } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { throttle, verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const BASE = "/iso20022-edu/";
const FLOW = `${url}flows/pacs.008-agent-chain/`;
const MSG = `${BASE}messages/pacs.008.001.14/`;
const SAMPLE = `${MSG}pacs.008-intermediary/`;
const TITLE = "One customer payment across three banks";

// What each step must show, in the order of the flow data.
type Step = {
  from: string;
  to: string;
  message?: string;
  settlement?: string;
  elements?: number;
  sample?: true;
};
const VARIANTS: { id: string; tab: string; steps: Step[] }[] = [
  {
    id: "serial",
    tab: "Serial",
    steps: [
      { from: "debtor", to: "debtorAgent" },
      {
        from: "debtorAgent",
        to: "intermediary",
        message: "pacs.008 #1",
        settlement: "INDA",
        elements: 7,
        sample: true,
      },
      { from: "intermediary", to: "creditorAgent", message: "pacs.008 #2" },
      { from: "creditorAgent", to: "creditor" },
    ],
  },
  {
    id: "cover",
    tab: "Cover",
    steps: [
      { from: "debtor", to: "debtorAgent" },
      {
        from: "debtorAgent",
        to: "creditorAgent",
        message: "pacs.008",
        settlement: "COVE",
        elements: 1,
      },
      { from: "debtorAgent", to: "intermediary", message: "cover payment" },
      { from: "intermediary", to: "creditorAgent" },
      { from: "creditorAgent", to: "creditor" },
    ],
  },
];

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
const settle = verifying(check);
const open = async (
  width: number,
  to: string,
  reducedMotion: "reduce" | "no-preference" = "no-preference",
) => {
  const p = await (
    await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion,
    })
  ).newPage();
  await throttle(p);
  await p.goto(to, { waitUntil: "networkidle" });
  return p;
};

// the player's state, read in the page
const read = () => {
  const d = document.querySelector("[data-flow-detail]")!;
  const dd = (name: string) =>
    [...d.querySelectorAll("dt")].find((x) => x.textContent === name)
      ?.nextElementSibling?.textContent ?? null;
  const a = document.activeElement;
  return {
    tab: document.querySelector("[role=tab][aria-selected=true]")?.textContent,
    counter: d.querySelector("p")?.textContent ?? "",
    hash: location.hash,
    roles: Object.fromEntries(
      [...document.querySelectorAll("[data-participant][data-role]")].map(
        (e) => [
          (e as HTMLElement).dataset.participant!,
          (e as HTMLElement).dataset.role!,
        ],
      ),
    ),
    message: dd("What travels"),
    settlement: dd("Settlement method"),
    elements: [...d.querySelectorAll("dl a")].map((x) => ({
      href: (x as HTMLAnchorElement).pathname + (x as HTMLAnchorElement).hash,
      text: x.textContent ?? "",
    })),
    sample: [...d.querySelectorAll("a")]
      .filter((x) => !x.closest("dl"))
      .map((x) => (x as HTMLAnchorElement).pathname),
    focus: a ? (a.textContent ?? "") : "",
    current: [...document.querySelectorAll("ol[aria-label=Steps] button")]
      .map((b, k) => (b.getAttribute("aria-current") === "step" ? k : -1))
      .filter((k) => k >= 0),
    notice: [...document.querySelectorAll("p")]
      .filter((x) => x.textContent?.startsWith("This outline rests on"))
      .map((x) => x.checkVisibility()),
  };
};
type State = ReturnType<typeof read>;

// Does the state show step `i` (zero-based) of variant `v` as the data says?
const shows = (s: State, v: (typeof VARIANTS)[number], i: number) => {
  const e = v.steps[i]!;
  const roles = (r: Record<string, string>) =>
    JSON.stringify(Object.entries(r).sort());
  return (
    s.tab === v.tab &&
    s.counter === `Step ${i + 1} of ${v.steps.length}` &&
    s.hash === `#${v.id}/${i + 1}` &&
    roles(s.roles) === roles({ [e.from]: "Sender", [e.to]: "Receiver" }) &&
    s.message === (e.message ?? null) &&
    (e.settlement
      ? s.settlement?.startsWith(`${e.settlement}: `) === true
      : s.settlement === null) &&
    s.elements.length === (e.elements ?? 0) &&
    s.elements.every((l) => l.href === `${MSG}#${l.text}`) &&
    JSON.stringify(s.sample) === JSON.stringify(e.sample ? [SAMPLE] : []) &&
    // the Cover notice is shown in cover and absent in serial
    JSON.stringify(s.notice) === JSON.stringify(v.id === "cover" ? [true] : [])
  );
};
const next = (p: Page) => p.getByRole("button", { name: "Next step" });
const prev = (p: Page) => p.getByRole("button", { name: "Previous step" });
const layout = () => ({
  diagram: !!document
    .querySelector("[aria-label='The parties in the chain']")
    ?.checkVisibility(),
  list: !!document.querySelector("ol[aria-label=Steps]")?.checkVisibility(),
});

try {
  // 1280: walk every variant forward, then back
  const d = await open(1280, FLOW);
  await settle(
    d,
    "a fresh load shows serial step 1 and leaves the hash alone",
    read,
    (x) => x.tab === "Serial" && x.counter === "Step 1 of 4" && x.hash === "",
  );
  // the walk starts from a click on each tab, which writes the hash
  await d.getByRole("tab", { name: "Cover" }).click();
  for (const v of VARIANTS) {
    const seen = new Set<string>();
    // the participants come from the page, not from a list here
    const all = await d.evaluate(() =>
      [...document.querySelectorAll("[data-participant]")].map(
        (e) => (e as HTMLElement).dataset.participant!,
      ),
    );
    check(
      all.length >= 2,
      `${v.id}: the page lists its participants (${all.join(", ")})`,
    );
    await d.getByRole("tab", { name: v.tab }).click();
    await settle(d, `${v.id}: the tab opens step 1`, read, (x) =>
      shows(x, v, 0),
    );
    const n = v.steps.length;
    for (let i = 0; i < n; i++) {
      if (i > 0) await next(d).click();
      const s = await settle(
        d,
        `${v.id} step ${i + 1}: roles, label, settlement, links, sample link, notice and hash match the data`,
        read,
        (x) => shows(x, v, i),
      );
      for (const id of Object.keys(s?.roles ?? {})) seen.add(id);
    }
    check(
      all.every((id) => seen.has(id)),
      `${v.id}: every participant is Sender or Receiver somewhere (saw ${[...seen].join(", ")})`,
    );

    // at the last step Next does nothing and keeps focus
    await next(d).focus();
    await d.keyboard.press("Enter");
    await settle(
      d,
      `${v.id}: Next at the last step changes nothing and the focus stays on Next`,
      read,
      (x) => shows(x, v, n - 1) && x.focus === "Next step",
    );
    for (let i = n - 2; i >= 0; i--) {
      await prev(d).click();
      await settle(
        d,
        `${v.id}: Previous goes back to step ${i + 1}`,
        read,
        (x) => shows(x, v, i),
      );
    }
    await prev(d).click({ force: true });
    await settle(
      d,
      `${v.id}: Previous at step 1 changes nothing`,
      read,
      (x) => shows(x, v, 0) && x.focus === "Previous step",
    );
  }

  // the settlement wording comes with the code
  await d.getByRole("tab", { name: "Cover" }).click();
  await next(d).click();
  await settle(d, "cover step 2 shows the COVE settlement text", read, (x) =>
    /^COVE: .{10}/.test(x.settlement ?? ""),
  );

  // variant switch resets to step 1
  await d.getByRole("tab", { name: "Serial" }).click();
  await next(d).click();
  await next(d).click();
  await settle(d, "serial step 3 before the switch", read, (x) =>
    shows(x, VARIANTS[0]!, 2),
  );
  await d.getByRole("tab", { name: "Cover" }).click();
  await settle(d, "switching to Cover resets to step 1", read, (x) =>
    shows(x, VARIANTS[1]!, 0),
  );

  await settle(
    d,
    "1280: the diagram is visible and the step list is not",
    layout,
    (x) => x.diagram && !x.list,
  );

  // deep link
  const deep = await open(1280, `${FLOW}#cover/3`);
  await settle(deep, "#cover/3 opens cover step 3", read, (x) =>
    shows(x, VARIANTS[1]!, 2),
  );

  // motion: the marker travels and the connector pulses only when motion is allowed; either way the marker
  // ends on the receiving card
  const motion = () => {
    const m = getComputedStyle(document.querySelector("[data-flow-marker]")!);
    const c = getComputedStyle(
      document.querySelector("[data-flow-connector]")!,
    );
    return {
      transition: m.transitionDuration,
      animation: c.animationName,
      animationTime: c.animationDuration,
    };
  };
  // the card is named by the flow data (passed in), not by the page's own receiver role
  const onCard = (id: string) => {
    const m = document
      .querySelector("[data-flow-marker]")!
      .getBoundingClientRect();
    const r = document
      .querySelector(`[data-participant="${id}"]`)!
      .getBoundingClientRect();
    return {
      counter:
        document.querySelector("[data-flow-detail] p")?.textContent ?? "",
      x: m.left + m.width / 2,
      left: r.left,
      right: r.right,
      top: r.top,
      y: m.top + m.height / 2,
    };
  };
  for (const mode of ["reduce", "no-preference"] as const) {
    const a = await open(1280, FLOW, mode);
    await settle(
      a,
      `${mode}: marker transition and connector animation are ${mode === "reduce" ? "off" : "on"}`,
      motion,
      (x) =>
        mode === "reduce"
          ? x.transition === "0s" && x.animation === "none"
          : parseFloat(x.transition) > 0 &&
            x.animation !== "none" &&
            parseFloat(x.animationTime) > 0,
    );
    await next(a).click();
    const to = VARIANTS[0]!.steps[1]!.to;
    await settle(
      a,
      `${mode}: after Next serial step 2 shows and the marker ends on its receiver (${to})`,
      onCard,
      (x) =>
        x.counter === "Step 2 of 4" &&
        x.x > x.left &&
        x.x < x.right &&
        Math.abs(x.y - x.top) < 2,
      to,
    );
  }

  // 390: step list instead of the diagram; picking a step selects it; no horizontal scroll
  const m = await open(390, FLOW);
  await settle(
    m,
    "390: the step list is visible and the diagram is not",
    layout,
    (x) => !x.diagram && x.list,
  );
  for (const v of VARIANTS) {
    await m.getByRole("tab", { name: v.tab }).click();
    const i = 2;
    await m.locator("ol[aria-label=Steps] button").nth(i).click();
    await settle(
      m,
      `390 ${v.id}: picking step ${i + 1} in the list selects it`,
      read,
      (x) => shows(x, v, i) && JSON.stringify(x.current) === `[${i}]`,
    );
    await m.locator("ol[aria-label=Steps] button").last().click();
    await settle(
      m,
      `390 ${v.id}: no horizontal scroll at the last step`,
      () => ({
        w: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }),
      (x) => x.w <= x.c,
    );
  }

  // Start here step 4 offers "Open step" to the flow page; lesson 4 links it
  const home = await open(1280, url);
  await settle(
    home,
    "Start here step 4 shows Open step linking the flow page",
    () =>
      [...document.querySelectorAll("#step-flow ~ div a")].map((a) => ({
        text: a.textContent,
        path: (a as HTMLAnchorElement).pathname,
      })),
    (links) =>
      links.some(
        (l) =>
          l.text?.includes("Open step") &&
          l.path === `${BASE}flows/pacs.008-agent-chain/`,
      ),
  );
  const lesson = await open(1280, `${url}lessons/follow-the-flow/`);
  await settle(
    lesson,
    "lesson 4 links the flow page and no longer says Coming soon",
    () => ({
      links: [...document.querySelectorAll(".lesson a")].map(
        (a) => (a as HTMLAnchorElement).pathname,
      ),
      soon: !!document
        .querySelector(".lesson")
        ?.textContent?.includes("oming soon"),
    }),
    (x) => x.links.includes(`${BASE}flows/pacs.008-agent-chain/`) && !x.soon,
  );

  // Ctrl+K finds the flow page
  const q = await open(1280, url);
  await q.keyboard.press("Control+K");
  await q.getByRole("combobox").fill("customer payment across");
  await settle(
    q,
    `Ctrl+K lists the flow page "${TITLE}" under Pages`,
    () => {
      const g = [
        ...document.querySelectorAll("dialog[data-palette] [role=group]"),
      ].find((e) => e.firstElementChild?.textContent === "Pages");
      return [...(g?.querySelectorAll("[role=option]") ?? [])].map(
        (o) => o.textContent ?? "",
      );
    },
    (rows) => rows.some((r) => r.startsWith(TITLE)),
  );
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
