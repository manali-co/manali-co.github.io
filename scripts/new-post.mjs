#!/usr/bin/env node
// Create a new post with the right front matter. Made for people and agents alike.
//   npm run new -- --title "Yapp learns to undo" --project yapp --author claude
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, [])
);

const title = args.title;
if (!title) {
  console.error('usage: npm run new -- --title "Post title" [--project yapp|what-should-we-watch|manali] [--author ayush|claude] [--draft]');
  process.exit(1);
}
const project = args.project || "manali";
const author = args.author || "ayush";
const date = new Date().toISOString().slice(0, 10);
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const dir = resolve("content/posts");
mkdirSync(dir, { recursive: true });
const file = resolve(dir, `${date}-${slug}.md`);
if (existsSync(file)) {
  console.error(`already exists: ${file}`);
  process.exit(1);
}
writeFileSync(
  file,
  `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
author: ${author}
project: ${project}
summary: ""
${args.draft === "true" ? "draft: true\n" : ""}---

`
);
console.log(file);
