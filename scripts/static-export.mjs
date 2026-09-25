#!/usr/bin/env node
// Static build for GitHub Pages: park the server-only routes, export, put them back.
import { existsSync, renameSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const parked = ["src/app/api", "src/app/admin", "src/app/sign-in", "src/app/unsubscribe", "src/proxy.ts"];
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
if (code === 0) fixOgImages("out");
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
