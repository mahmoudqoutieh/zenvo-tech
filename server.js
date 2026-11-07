// Minimal static server (no dependencies) for hosts that run the site as a Node.js app.
const http = require("http");
const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "dist");
const ROOT = fs.existsSync(path.join(dist, "index.html")) ? dist : __dirname;
const PORT = process.env.PORT || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon", ".json": "application/json",
};
const PUBLIC = new Set(["index.html", "admin.html", "thanks.html", "404.html", "checkout.js", "config.js", "robots.txt"]);

function send(res, status, file, extra = {}) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(status, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
    "Cache-Control": ext === ".png" || ext === ".svg" ? "public, max-age=2592000" : "no-cache",
    ...extra,
  });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { p = "/"; }
  if (p === "/" || p.endsWith("/")) p += "index.html";
  const rel = path.normalize(p).replace(/^([/\\])+/, "");
  const file = path.join(ROOT, rel);
  const allowed = !rel.includes("..") && (PUBLIC.has(rel) || rel.startsWith("assets" + path.sep) || rel.startsWith("assets/"));
  if (allowed && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const extra = rel === "admin.html" ? { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } : {};
    return send(res, 200, file, extra);
  }
  send(res, 404, path.join(ROOT, "404.html"));
}).listen(PORT, () => console.log(`Zenvo Tech running on port ${PORT}`));
