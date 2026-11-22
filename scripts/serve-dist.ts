// Static server over dist, mounted at the site base path. Shared by the browser checks.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

export const DIST = "dist";
export const BASE = "/iso20022-edu/";
const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  // pagefind's binary files (.pf_*, .pagefind) fall through to octet-stream
};

export async function serveDist() {
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
    // UI_DELAY_MS=300 holds back every schema-tree file, to try the checks on a slow network
    const hold = p.includes("/tree/")
      ? Number(process.env.UI_DELAY_MS ?? 0)
      : 0;
    const send = () => {
      res.writeHead(200, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
      });
      createReadStream(file).pipe(res);
    };
    if (hold) setTimeout(send, hold);
    else send();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  return { server, url: `http://127.0.0.1:${port}${BASE}` };
}
