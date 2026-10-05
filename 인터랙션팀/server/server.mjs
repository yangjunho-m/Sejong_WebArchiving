import http from "node:http";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const serverRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(serverRoot, "..");
const previewClients = new Set();
let previewVersion = Date.now();
const reloadScript = `<script>
(() => {
  let version;
  const changes = new EventSource('/__preview_events');
  changes.onmessage = (event) => {
    if (version !== undefined && version !== event.data) location.reload();
    version = event.data;
  };
})();
</script>`;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};
export const server = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    const url = new URL(req.url, "http://localhost");
    const requested = decodeURIComponent(url.pathname);
    if (requested === "/__preview_events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      res.write(`data: ${previewVersion}\n\n`);
      previewClients.add(res);
      const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 15000);
      res.on("close", () => {
        clearInterval(heartbeat);
        previewClients.delete(res);
      });
      return;
    }
    const file = path.resolve(
      root,
      "." + (requested === "/" ? "/index.html" : requested),
    );
    const relative = path.relative(root, file);
    // Only runtime assets are served; the source spreadsheet stays local.
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      !/^(index\.html$|scripts[\\/]|data[\\/]catalog\.json$|img[\\/]|font[\\/])/.test(
        relative,
      )
    ) {
      res.writeHead(404);
      return res.end("Not found");
    }
    let body = await readFile(file);
    if (relative === "index.html") {
      body = body.toString().replace("</body>", `${reloadScript}</body>`);
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let reloadTimer;
  const watcher = watch(root, { recursive: true }, (_, filename) => {
    if (!filename || !/^(index\.html$|scripts[\\/]|data[\\/]catalog\.json$|img[\\/]|font[\\/])/.test(filename)) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      previewVersion++;
      for (const client of previewClients) client.write(`data: ${previewVersion}\n\n`);
    }, 200);
  });
  server.on("close", () => {
    watcher.close();
    clearTimeout(reloadTimer);
  });
  server.listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
    console.log("Button Up: http://127.0.0.1:" + (process.env.PORT || 4173)),
  );
}
