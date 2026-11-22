// Runs axe on every built page, light and dark, at desktop and phone width, served under the site base path.
import { readdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { DIST, serveDist } from "./serve-dist.ts";
import { settled } from "./ui-wait.ts";

const pages = (readdirSync(DIST, { recursive: true }) as string[])
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replaceAll("\\", "/"));

const { server, url } = await serveDist();

const browser = await chromium.launch();
let bad = 0;
try {
  for (const page of pages) {
    for (const [width, theme] of [
      [1280, "light"],
      [1280, "dark"],
      [390, "light"],
      [390, "dark"],
    ] as const) {
      const tab = await (
        await browser.newContext({ viewport: { width, height: 800 } })
      ).newPage();
      await tab.goto(`${url}${page}`, {
        waitUntil: "networkidle",
      });
      await tab.evaluate(
        (t) => document.documentElement.classList.toggle("dark", t === "dark"),
        theme,
      );
      // The workspace page shows one pane at a time at 390: scan each tab, with an element selected.
      const stages: [string, (() => Promise<unknown>) | null][] = [["", null]];
      if (width === 390 && page.startsWith("messages/"))
        stages.splice(
          0,
          1,
          ["XML tab", null],
          ["Details tab", () => tab.click('[data-id="GrpHdr/MsgId"]')],
          ["Tree tab", () => tab.getByRole("tab", { name: "Tree" }).click()],
          [
            "XML tab, selected",
            () => tab.getByRole("tab", { name: "XML" }).click(),
          ],
        );
      // The flow page: scan the first step, then the last step of each variant (the inactive tab's aria-controls is scanned too).
      if (page.startsWith("flows/"))
        for (const [tabName, steps] of [
          ["Serial", 4],
          ["Cover", 5],
        ] as const)
          stages.push([
            `${tabName}, last step`,
            async () => {
              await tab.getByRole("tab", { name: tabName }).click();
              for (let i = 1; i < steps; i++)
                await tab.getByRole("button", { name: "Next step" }).click();
              await settled(
                tab,
                `${page} ${tabName}: at the last step`,
                () =>
                  document.querySelector("[data-flow-detail] p")?.textContent,
                (v) => v === `Step ${steps} of ${steps}`,
              );
            },
          ]);
      for (const [stage, go] of stages) {
        await go?.();
        const { violations } = await new AxeBuilder({ page: tab }).analyze();
        console.log(
          `${violations.length ? "FAIL" : "ok  "} ${page} (${width}px ${theme}${stage ? ", " + stage : ""}): ${violations.length} violation(s)`,
        );
        for (const v of violations) {
          bad++;
          console.log(`  ${v.id} [${v.impact}] ${v.help}`);
          for (const n of v.nodes) console.log(`    ${n.target.join(" ")}`);
        }
      }
      // The palette open: empty (no listbox rows), with element rows, and with a Pages row.
      await tab.getByRole("button", { name: "Search" }).click();
      for (const [stage, query, group] of [
        ["palette, empty", "", ""],
        ["palette, elements", "Id", "Elements"],
        ["palette, pages", "money", "Pages"],
      ] as const) {
        await tab.getByRole("combobox").fill(query);
        // the expected group must be listed before the scan (the empty state lists none)
        await settled(
          tab,
          `${page} ${stage}: group shown`,
          (g) =>
            [...document.querySelectorAll("dialog[open] [role=group]")].some(
              (e) => e.firstElementChild?.textContent === g,
            ) || g === "",
          (v) => v,
          group,
        );
        const { violations } = await new AxeBuilder({ page: tab }).analyze();
        console.log(
          `${violations.length ? "FAIL" : "ok  "} ${page} (${width}px ${theme}, ${stage}): ${violations.length} violation(s)`,
        );
        for (const v of violations) {
          bad++;
          console.log(`  ${v.id} [${v.impact}] ${v.help}`);
          for (const n of v.nodes) console.log(`    ${n.target.join(" ")}`);
        }
      }
      await tab.context().close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
