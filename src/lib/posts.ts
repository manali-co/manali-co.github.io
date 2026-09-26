import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { authors, type Author } from "./site";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(anchor, {
  permalink: anchor.permalink.headerLink({ safariReaderFix: true }),
});

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
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const slug = data.slug || slugOf(file);
    const html = md.render(content);
    const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date || file.slice(0, 10));
    return {
      slug,
      title: String(data.title || slug),
      date,
      author: authors[data.author] || authors.ayush,
      project: (data.project || "manali") as Post["project"],
      summary: String(data.summary || ""),
      cover: data.cover,
      coverAlt: data.coverAlt,
      coverText: data.coverText ? String(data.coverText) : undefined,
      coverVariant: data.coverVariant,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      draft: Boolean(data.draft),
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
