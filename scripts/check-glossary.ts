// Browser check for the glossary: the list against the YAML, every internal link, the Details pane link,
// an element without a term, no sideways scroll at 390px. Needs a built dist (npm run build).
import { readdirSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { chromium } from "playwright";
import { resolvePath } from "../src/lib/resolver.ts";
import type { Schema } from "./schema-model.ts";
import { serveDist } from "./serve-dist.ts";
import { throttle, verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const BASE = "/iso20022-edu/";
const DIR = "src/content/glossary";
type Term = { id: string; term: string; message: string; elements: string[] };
const terms = readdirSync(DIR)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => parseYaml(readFileSync(`${DIR}/${f}`, "utf8")) as Term);
const schema = JSON.parse(
  readFileSync("src/data/schema/pacs.008.001.14.json", "utf8"),
) as Schema;
const WS = `${url}messages/pacs.008.001.14/`;
const SM = "GrpHdr/SttlmInf/SttlmMtd";
const smTerm = terms.find((t) => t.elements.includes(SM))!;
// an element no term claims: asserted against the YAML and the schema, so the check cannot pass on a claimed path
const FREE = "GrpHdr/NbOfTxs";
const claimed = new Set(terms.flatMap((t) => t.elements));

const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
const settle = verifying(check);
const open = async (width: number, to: string) => {
  const p = await (
    await browser.newContext({ viewport: { width, height: 900 } })
  ).newPage();
  await throttle(p);
  await p.goto(to, { waitUntil: "networkidle" });
  return p;
};
const links = (p: Awaited<ReturnType<typeof open>>) =>
  p.evaluate(
    (o) =>
      [...document.querySelectorAll("a[href]")]
        .map((a) => new URL((a as HTMLAnchorElement).href))
        .filter(
          (u) => u.origin === o && u.pathname.startsWith("/iso20022-edu/"),
        )
        .map((u) => u.pathname + u.hash),
    new URL(url).origin,
  );

try {
  check(
    !claimed.has(FREE) && !!resolvePath(schema, FREE),
    `${FREE} is in the schema and no term file claims it`,
  );

  // (a) list size from the YAML files
  const g = await open(1280, `${url}glossary/`);
  await settle(
    g,
    `the glossary lists ${terms.length} terms, one per YAML file`,
    () => ({
      ids: [
        ...document.querySelectorAll(
          "[data-glossary-list] [data-glossary-term]",
        ),
      ]
        .map((e) => e.getAttribute("data-glossary-term")!)
        .sort(),
    }),
    (s) =>
      JSON.stringify(s.ids) === JSON.stringify(terms.map((t) => t.id).sort()),
  );

  // (b) every internal link answers 200; every workspace fragment is a schema path
  const pages = [
    `${url}glossary/`,
    ...terms.map((t) => `${url}glossary/${t.id}/`),
  ];
  const all = new Set<string>();
  let wsLinks = 0;
  const wrongFrags: string[] = [];
  for (const to of pages) {
    await g.goto(to, { waitUntil: "networkidle" });
    const ws: string[] = [];
    for (const l of await links(g)) {
      all.add(l);
      if (l.includes("/messages/")) {
        wsLinks++;
        ws.push(l.split("#")[1] ?? "");
      }
    }
    const own =
      terms.find((t) => to === `${url}glossary/${t.id}/`)?.elements ?? [];
    if (JSON.stringify([...ws].sort()) !== JSON.stringify([...own].sort()))
      wrongFrags.push(`${to.slice(url.length)}: ${ws.join(",") || "none"}`);
  }
  const wantWs = terms.reduce((n, t) => n + t.elements.length, 0);
  check(
    wsLinks === wantWs,
    `term pages hold ${wantWs} workspace links (${wsLinks})`,
  );
  check(
    wrongFrags.length === 0,
    `each term page links exactly its own elements (${wrongFrags.join(" | ")})`,
  );
  const badStatus: string[] = [];
  const badPath: string[] = [];
  for (const l of all) {
    const [path, frag] = l.split("#");
    const r = await g.request.get(new URL(path!, url).href);
    if (r.status() !== 200) badStatus.push(`${path} ${r.status()}`);
    if (frag && !resolvePath(schema, frag)) badPath.push(frag);
  }
  check(
    all.size > terms.length && badStatus.length === 0,
    `${all.size} distinct internal links all return 200 (${badStatus.join(", ")})`,
  );
  check(
    badPath.length === 0,
    `every workspace fragment is a schema path (${badPath.join(", ")})`,
  );
  const f = await open(1280, `${WS}#${SM}`);
  await settle(
    f,
    `the workspace link fragment ${SM} selects its tree item`,
    (path) => ({
      tree: !!document.querySelector(
        `[role=treeitem][aria-selected='true'][data-path="${path}"]`,
      ),
    }),
    (s) => s.tree,
    SM,
  );

  // (c) the Details pane links the term, and the link lands on its page
  const glossarySection = () => {
    const h = [...document.querySelectorAll("section > h3")].find(
      (x) => x.textContent === "Glossary",
    );
    return {
      title: document.querySelector("[aria-live] h2")?.textContent ?? "",
      link: h?.parentElement?.querySelector("a")?.textContent ?? null,
    };
  };
  const hasLink = await settle(
    f,
    `1280: the Details pane for ${SM} has a Glossary link named ${smTerm.term}`,
    glossarySection,
    (s) => s.link === smTerm.term,
  );
  if (hasLink) {
    await f.locator("section:has(> h3) a", { hasText: smTerm.term }).click();
    await f.waitForURL(`${url}glossary/${smTerm.id}/`).catch(() => {}); // a miss shows in the read below
  }
  await settle(
    f,
    `clicking it lands on /glossary/${smTerm.id}/ with ${smTerm.term} as h1`,
    () => ({
      path: location.pathname,
      h1: document.querySelector("h1")?.textContent ?? "",
    }),
    (s) => s.path === `${BASE}glossary/${smTerm.id}/` && s.h1 === smTerm.term,
  );

  // (d) an element with no term has no Glossary section
  const n = await open(1280, `${WS}#${FREE}`);
  await settle(
    n,
    `1280: ${FREE} is selected and its Details pane has no Glossary section`,
    (path) => ({
      tree: !!document.querySelector(
        `[role=treeitem][aria-selected='true'][data-path="${path}"]`,
      ),
      title: document.querySelector("[aria-live] h2")?.textContent ?? "",
      sections: [...document.querySelectorAll("section > h3")].map(
        (h) => h.textContent ?? "",
      ),
    }),
    (s) =>
      s.tree &&
      s.title.length > 0 &&
      s.sections.length > 0 &&
      !s.sections.includes("Glossary"),
    FREE,
  );

  // (e) no sideways scroll at 390px
  for (const to of [`${url}glossary/`, `${url}glossary/${smTerm.id}/`]) {
    const m = await open(390, to);
    await settle(
      m,
      `390: ${to.slice(url.length)} does not scroll sideways`,
      () => ({ w: document.documentElement.scrollWidth, i: innerWidth }),
      (x) => x.w <= x.i,
    );
  }
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
