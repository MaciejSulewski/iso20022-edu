// Runs axe on every built page, light and dark, at desktop and phone width, served under the site base path.
import { readdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { DIST, serveDist } from "./serve-dist.ts";

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
      const { violations } = await new AxeBuilder({ page: tab }).analyze();
      console.log(
        `${violations.length ? "FAIL" : "ok  "} ${page} (${width}px ${theme}): ${violations.length} violation(s)`,
      );
      for (const v of violations) {
        bad++;
        console.log(`  ${v.id} [${v.impact}] ${v.help}`);
        for (const n of v.nodes) console.log(`    ${n.target.join(" ")}`);
      }
      await tab.context().close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (bad) process.exit(1);
