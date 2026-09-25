#!/usr/bin/env node
// Static build for GitHub Pages: park the server-only routes, export, put them back.
import { existsSync, renameSync, mkdirSync, rmSync } from "node:fs";
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
process.exit(code);
