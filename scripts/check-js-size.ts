// Fails if any built page loads more than BUDGET_KB of gzipped JS.
import { readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 100;
const DIST = "dist";
const BASE = "/iso20022-edu/";

const pages = (readdirSync(DIST, { recursive: true }) as string[])
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replaceAll("\\", "/"));
const gz = (s: string | Buffer) => gzipSync(s).length;

// Collect a JS file and everything it imports (static or dynamic) once.
function collect(file: string, seen: Set<string>) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = readFileSync(join(DIST, file), "utf8");
  for (const m of src.matchAll(
    /(?:from|import)\s*\(?\s*["'](\.[^"']+\.js)["']/g,
  )) {
    collect(posix.join(posix.dirname(file), m[1]!), seen);
  }
}

let failed = false;
for (const page of pages) {
  const html = readFileSync(join(DIST, page), "utf8");
  const files = new Set<string>();
  let inline = 0;
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = /\ssrc="([^"]+)"/.exec(m[1]!)?.[1];
    if (src) files.add(src);
    else inline += gz(m[2]!);
  }
  for (const m of html.matchAll(
    /(?:modulepreload"[^>]*href|(?:component|renderer)-url)="([^"]+)"/g,
  )) {
    files.add(m[1]!);
  }
  const seen = new Set<string>();
  for (const f of files) {
    if (f.startsWith(BASE)) collect(f.slice(BASE.length), seen);
  }
  let total = inline;
  for (const f of seen) total += gz(readFileSync(join(DIST, f)));
  const kb = total / 1024;
  const over = kb > BUDGET_KB;
  failed ||= over;
  console.log(
    `${over ? "FAIL" : "ok  "} ${page.padEnd(20)} ${kb.toFixed(1)} KB gzip (${seen.size} files + inline ${inline} B)`,
  );
}
if (failed) {
  console.error(`JS budget of ${BUDGET_KB} KB gzip exceeded.`);
  process.exit(1);
}
