// Runs axe on every built page, light and dark, served under the site base path.
import { createReadStream, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const DIST = "dist";
const BASE = "/iso20022-edu/";
const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

const pages = (readdirSync(DIST, { recursive: true }) as string[])
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replaceAll("\\", "/"));

const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? "").split("?")[0]!);
  if (!p.startsWith(BASE)) p = "/404.html";
  else p = p.slice(BASE.length - 1);
  let file = normalize(join(DIST, p));
  if (!file.startsWith(DIST)) file = join(DIST, "404.html");
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    statSync(file);
  } catch {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    "content-type": types[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as { port: number }).port;

const browser = await chromium.launch();
let bad = 0;
try {
  for (const page of pages) {
    for (const theme of ["light", "dark"]) {
      const tab = await (await browser.newContext()).newPage();
      await tab.goto(`http://127.0.0.1:${port}${BASE}${page}`, {
        waitUntil: "networkidle",
      });
      await tab.evaluate(
        (t) => document.documentElement.classList.toggle("dark", t === "dark"),
        theme,
      );
      const { violations } = await new AxeBuilder({ page: tab }).analyze();
      console.log(
        `${violations.length ? "FAIL" : "ok  "} ${page} (${theme}): ${violations.length} violation(s)`,
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
