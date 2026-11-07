// Copies the static site into ./dist (no dependencies needed).
const fs = require("fs");
const path = require("path");

const root = __dirname;
const out = path.join(root, "dist");
const files = ["index.html", "admin.html", "thanks.html", "404.html", "checkout.js", "config.js", "robots.txt", ".htaccess"];
const dirs = ["assets"];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, f));
}
for (const d of dirs) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
console.log("Built site into dist/");
