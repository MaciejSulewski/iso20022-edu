// Browser check for the sample switcher: the default URL keeps the first sample, the second sample is reachable
// and explained. Needs a built dist (npm run build).
import { chromium } from "playwright";
import { serveDist } from "./serve-dist.ts";
import { verifying } from "./ui-wait.ts";

const { server, url } = await serveDist();
const page = `${url}messages/pacs.008.001.14/`;
const browser = await chromium.launch();
let bad = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) bad++;
};
const settle = verifying(check);
const msgId = () =>
  document.querySelector('[data-id="GrpHdr/MsgId"]')?.parentElement
    ?.textContent ?? "";
const links = () =>
  [...document.querySelectorAll("nav[aria-label='Example messages'] a")].map(
    (a) => ({
      text: a.textContent!.trim(),
      current: a.getAttribute("aria-current"),
    }),
  );

try {
  for (const width of [1280, 390]) {
    const p = await (
      await browser.newContext({ viewport: { width, height: 900 } })
    ).newPage();
    await p.goto(page, { waitUntil: "networkidle" });
    await settle(
      p,
      `${width}px: default URL shows pacs.008-basic`,
      msgId,
      (t) => t.includes("MSG-2026-0001"),
    );
    await settle(
      p,
      `${width}px: switcher lists both samples, first is current`,
      links,
      (v) =>
        v.length === 2 &&
        v[0]!.current === "page" &&
        v[1]!.current === null &&
        v[1]!.text.includes("Intermediary agent"),
    );
    check(
      (await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      )) === true,
      `${width}px: no horizontal overflow`,
    );
    await p.getByRole("link", { name: "Intermediary agent" }).click();
    await p.waitForURL("**/pacs.008-intermediary/");
    await settle(
      p,
      `${width}px: second sample shows its own MsgId`,
      msgId,
      (t) => t.includes("MSG-2026-0042"),
    );
    await settle(
      p,
      `${width}px: second sample is current`,
      links,
      (v) => v[1]?.current === "page" && v[0]?.current === null,
    );
    check(
      (await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      )) === true,
      `${width}px: second page has no horizontal overflow`,
    );
    for (const [path, text] of [
      ["CdtTrfTxInf/IntrmyAgt1/FinInstnId/BICFI", "intermediary bank"],
      ["CdtTrfTxInf/RmtInf/Strd", "structured remittance"],
    ] as const) {
      if (width < 700) await p.getByRole("tab", { name: "XML" }).click(); // a selection moves to the Details tab
      await p.click(`[data-id="${path}"]`);
      await settle(
        p,
        `${width}px: ${path} opens its explanation`,
        () => document.querySelector("aside")?.textContent ?? "",
        (t) => t.includes(text),
      );
    }
    await p.context().close();
  }
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
