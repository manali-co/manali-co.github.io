import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { authors, projectLabel, type Author } from "./site";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/* html: false on purpose. Posts are written by people and by coding agents; Markdown is all a
   post needs, and a stray <script> in an agent's PR must not run on the same origin as /admin. */
const md = new MarkdownIt({ html: false, linkify: true, typographer: true }).use(anchor, {
  permalink: anchor.permalink.headerLink({ safariReaderFix: true }),
});
// Images in the body load lazily and never stretch past their own size. An "image" whose file
// is .mp4 or .webm becomes a silent, looping clip (a sibling .jpg with the same name is its poster).
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const src = String(tokens[idx].attrGet("src") || "");
  if (/\.(mp4|webm)$/i.test(src)) {
    const alt = tokens[idx].content.replace(/"/g, "&quot;");
    const poster = src.replace(/\.(mp4|webm)$/i, "-poster.jpg");
    const type = src.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
    return `<video class="clip" autoplay muted loop playsinline preload="metadata" poster="${poster}" aria-label="${alt}"><source src="${src}" type="${type}">${alt}</video>`;
  }
  tokens[idx].attrSet("loading", "lazy");
  tokens[idx].attrSet("decoding", "async");
  return self.renderToken(tokens, idx, options);
};

// A blockquote whose first words are "Aside:", "Note:" or "Confession:" renders as a callout with
// that word as its kicker; any other blockquote is a pull quote. Plain Markdown either way.
md.core.ruler.push("asides", (state) => {
  const t = state.tokens;
  for (let i = 0; i < t.length; i++) {
    if (t[i].type !== "blockquote_open") continue;
    const inline = t.slice(i + 1, i + 4).find((x) => x.type === "inline");
    const m = inline && /^(Aside|Note|Confession|Receipt|Rule):\s*/.exec(inline.content);
    if (!m) continue;
    t[i].attrJoin("class", "aside");
    t[i].attrSet("data-kicker", m[1]);
    inline.content = inline.content.slice(m[0].length);
    const first = inline.children?.[0];
    if (first && first.type === "text") first.content = first.content.slice(m[0].length);
  }
});

/* Inline colour and emphasis, still plain Markdown:
     ==text==            a highlight (sun tint)
     ::sun[text]         coloured ink: sun, indigo, rose, coral, moss
     ::big[text]         a size up, display face
     ::loud[text]        bold, sun-coloured, letter-spaced: the word you want shouted
   Nest them with **bold** and *italic* as usual. */
const INKS = new Set(["sun", "indigo", "rose", "coral", "moss", "big", "loud"]);
md.inline.ruler.before("emphasis", "ink", (state, silent) => {
  const src = state.src, pos = state.pos;
  const tokenizeSlice = (from: number, to: number) => {
    const savedPos = state.pos, savedMax = state.posMax;
    state.pos = from; state.posMax = to; state.md.inline.tokenize(state);
    state.pos = savedPos; state.posMax = savedMax;
  };
  // ==highlight==
  if (src.charCodeAt(pos) === 0x3d && src.charCodeAt(pos + 1) === 0x3d) {
    const end = src.indexOf("==", pos + 2);
    if (end < 0 || end === pos + 2 || end > state.posMax) return false;
    if (!silent) { state.push("mark_open", "mark", 1); tokenizeSlice(pos + 2, end); state.push("mark_close", "mark", -1); }
    state.pos = end + 2; return true;
  }
  // ::name[text]
  if (src.charCodeAt(pos) !== 0x3a || src.charCodeAt(pos + 1) !== 0x3a) return false;
  const m = /^::([a-z]+)\[/.exec(src.slice(pos, pos + 12));
  if (!m || !INKS.has(m[1])) return false;
  const start = pos + m[0].length; let depth = 1, i = start;
  for (; i < state.posMax; i++) { const c = src[i]; if (c === "[") depth++; else if (c === "]" && --depth === 0) break; }
  if (i >= state.posMax) return false;
  if (!silent) {
    const open = state.push("ink_open", "span", 1); open.attrSet("class", `ink ink--${m[1]}`);
    tokenizeSlice(start, i);
    state.push("ink_close", "span", -1);
  }
  state.pos = i + 1; return true;
});

const PROJECTS = new Set(Object.keys(projectLabel));
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;

/* Front matter mistakes fail the build with the file name, instead of quietly publishing a post
   as the wrong author, under the wrong project, or on top of another post. */
function check(file: string, data: Record<string, unknown>, slug: string, date: string, seen: Map<string, string>) {
  const fail = (why: string) => { throw new Error(`content/posts/${file}: ${why}`); };
  if (!data.title) fail("needs a title");
  if (!SLUG.test(slug)) fail(`slug "${slug}" must be lowercase letters, digits and dashes (set slug: in front matter or rename the file)`);
  if (seen.has(slug)) fail(`slug "${slug}" is already used by ${seen.get(slug)}`);
  seen.set(slug, file);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z"))) fail(`date "${date}" must be YYYY-MM-DD`);
  if (data.author !== undefined && !(String(data.author) in authors)) fail(`author "${String(data.author)}" is not one of: ${Object.keys(authors).join(", ")}`);
  if (data.project !== undefined && !PROJECTS.has(String(data.project))) fail(`project "${String(data.project)}" is not one of: ${[...PROJECTS].join(", ")}`);
  if (data.cover !== undefined) {
    const cover = String(data.cover);
    if (!cover.startsWith("/")) fail(`cover "${cover}" must be a site path such as /posts/${slug}/cover.webp (files live under public/)`);
    if (!fs.existsSync(path.join(process.cwd(), "public", cover))) fail(`cover "${cover}" does not exist under public/`);
  }
  if (!data.draft && !data.summary) fail("needs a summary (one or two sentences; it is the card text, the feed description and the email preview)");
}

export type Post = {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  author: Author;
  project: "yapp" | "what-should-we-watch" | "spark" | "manali";
  summary: string;
  cover?: string;
  coverAlt?: string;
  coverText?: string;
  coverVariant?: "type" | "icon" | "mono";
  tags: string[];
  draft: boolean;
  html: string;
  readingTime: string;
  url: string;
};

function readingTime(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

function slugOf(file: string) {
  return file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

export function getAllPosts({ includeDrafts = false } = {}): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md")).sort();
  const seen = new Map<string, string>();
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const slug = String(data.slug || slugOf(file));
    const html = md.render(content);
    const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date || file.slice(0, 10));
    check(file, data, slug, date, seen);
    return {
      slug,
      title: String(data.title || slug),
      date,
      author: authors[String(data.author || "ayush")],
      project: (data.project || "manali") as Post["project"],
      summary: String(data.summary || ""),
      cover: data.cover,
      coverAlt: data.coverAlt,
      coverText: data.coverText ? String(data.coverText) : undefined,
      coverVariant: data.coverVariant,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      draft: data.draft === true,
      html,
      readingTime: readingTime(html),
      url: `/blog/${slug}/`,
    } satisfies Post;
  });
  return posts
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string) {
  return getAllPosts().find((p) => p.slug === slug) || null;
}

export function getProjectPosts(project: string) {
  return getAllPosts().filter((p) => p.project === project || p.tags.includes(project));
}

export function readableDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
