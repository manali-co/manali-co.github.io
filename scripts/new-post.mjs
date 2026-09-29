#!/usr/bin/env node
// Create a new post with the right front matter. Made for people and agents alike.
//   npm run new -- --title "Yapp learns to undo" --project yapp --author claude
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, [])
);

const title = args.title;
if (!title) {
  console.error('usage: npm run new -- --title "Post title" [--summary "One line"] [--project yapp|what-should-we-watch|spark|manali] [--author ayush|claude] [--draft]');
  process.exit(1);
}
const PROJECTS = ["yapp", "what-should-we-watch", "spark", "portfolio", "manali"];
const AUTHORS = ["ayush", "claude"];
const project = args.project || "manali";
const author = args.author || "ayush";
if (!PROJECTS.includes(project)) { console.error(`--project must be one of ${PROJECTS.join(", ")}`); process.exit(1); }
if (!AUTHORS.includes(author)) { console.error(`--author must be one of ${AUTHORS.join(", ")}`); process.exit(1); }
const date = new Date().toISOString().slice(0, 10);
const slug = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
if (!slug) { console.error("the title needs at least one letter or digit for the slug"); process.exit(1); }
const dir = resolve("content/posts");
mkdirSync(dir, { recursive: true });
const taken = readdirSync(dir).find((f) => f.endsWith(`-${slug}.md`) || f === `${slug}.md`);
if (taken) {
  console.error(`slug "${slug}" is already used by content/posts/${taken}; pick another title or set slug: by hand`);
  process.exit(1);
}
const file = resolve(dir, `${date}-${slug}.md`);
// Posts are published by merging. Start a branch for it if we are sitting on main.
import { execSync } from "node:child_process";
let branch = "";
try {
  const current = execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  if (current === "main") { branch = `post/${slug}`; execSync(`git checkout -b ${branch}`, { stdio: "ignore" }); }
} catch {}
writeFileSync(
  file,
  `---
title: ${JSON.stringify(title)}
date: ${date}
author: ${author}
project: ${project}
summary: ${JSON.stringify(args.summary && args.summary !== "true" ? args.summary : "")}
# cover: /posts/${slug}/cover.webp   (put images under public/posts/${slug}/)\nask: ""   # one specific question for readers, shown above the reply box
${args.draft === "true" ? "draft: true\n" : ""}---

`
);
console.log(file);
console.log(`
Next:
  1. write it, then: npm run build        (front matter is checked here)
  2. git add content && git commit -m "Post: ${title.replace(/"/g, "'")}"
  3. git push -u origin ${branch || "$(git branch --show-current)"} && gh pr create --fill
  4. read the Vercel preview on the pull request; merging publishes it`);
