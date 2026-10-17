/* ============================================================
   tools/serve.mjs — خادم محلي بسيط للمعاينة
   الاستعمال:  npm run dev   ثم افتح  http://localhost:4321
   ============================================================ */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4321);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400).end("Bad Request");
    return;
  }

  if (urlPath.endsWith("/")) urlPath += "index.html";
  let file = path.join(ROOT, urlPath);

  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  // امتدادless: /about -> /about.html
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const withHtml = file + ".html";
    if (fs.existsSync(withHtml)) file = withHtml;
    else if (fs.existsSync(path.join(file, "index.html"))) file = path.join(file, "index.html");
  }

  if (!fs.existsSync(file)) {
    const nf = path.join(ROOT, "404.html");
    const body = fs.existsSync(nf) ? fs.readFileSync(nf) : "Not Found";
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
    return;
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n  tfkir.net — خادم محلي`);
  console.log(`  → http://localhost:${PORT}\n`);
});