#!/usr/bin/env node
// Static build for GitHub Pages: park the server-only routes, export, put them back.
import { existsSync, renameSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const parked = ["src/app/api", "src/app/admin", "src/app/sign-in", "src/app/unsubscribe", "src/app/confirm", "src/proxy.ts"];
// With no posts yet, the per-post routes have no params, which "output: export" refuses; park them too.
const hasPosts = existsSync("content/posts") && readdirSync("content/posts").some((f) => f.endsWith(".md"));
if (!hasPosts) parked.push("src/app/blog/[slug]");
const tmp = "node_modules/.static-parked"; // inside node_modules so the compiler never scans it
mkdirSync(tmp, { recursive: true });
const moved = [];
for (const p of parked) {
  if (existsSync(p)) { const dest = `${tmp}/${p.replace(/\//g, "__")}`; renameSync(p, dest); moved.push([p, dest]); }
}
let code = 0;
try {
  const r = spawnSync("npx", ["next", "build"], { stdio: "inherit", env: { ...process.env, STATIC_EXPORT: "1" } });
  code = r.status ?? 1;
} finally {
  for (const [p, dest] of moved) renameSync(dest, p);
  rmSync(tmp, { recursive: true, force: true });
}
if (code === 0) { fixOgImages("out"); redirectToCanonical("out"); }
process.exit(code);

// The export writes social cards as extension-less "opengraph-image" files, which Pages serves as
// application/octet-stream. Give them a .png twin and point every page at it so crawlers see an image.
function fixOgImages(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { fixOgImages(p); continue; }
    if (name === "opengraph-image" || name === "twitter-image") copyFileSync(p, p + ".png");
    else if (name.endsWith(".html") || name.endsWith(".txt")) {
      const before = readFileSync(p, "utf8");
      const after = before.replace(/(opengraph-image|twitter-image)(\\?)?\?[a-f0-9]+/g, "$1.png");
      if (after !== before) writeFileSync(p, after);
    }
  }
}

// The Pages copy is a mirror without the API, so anything interactive shows a fallback there. Every
// page sends the visitor straight to the same path on the canonical host; the content stays as a
// fallback for anyone with JavaScript and meta refresh both off.
function redirectToCanonical(dir, rel = "") {
  const host = (process.env.NEXT_PUBLIC_SITE_URL || "https://manali.page").replace(/\/$/, "");
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { redirectToCanonical(p, `${rel}/${name}`); continue; }
    if (name !== "index.html" && name !== "404.html") continue;
    const path = name === "404.html" ? "/" : `${rel}/`;
    const target = `${host}${path}`;
    const tag = `<meta http-equiv="refresh" content="0; url=${target}"><script>location.replace(${JSON.stringify(host)} + (${JSON.stringify(name === "404.html")} ? "/" : location.pathname + location.search + location.hash))</script>`;
    const html = readFileSync(p, "utf8").replace("<head>", "<head>" + tag);
    writeFileSync(p, html);
  }
}
