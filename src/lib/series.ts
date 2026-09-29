import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getAllPosts, readableDate, type Post } from "./posts";
import { projectLabel } from "./site";

/* A series is one file in content/series/<slug>.md:

     ---
     title: "Evening builds"
     summary: "One or two sentences for the hub page, the shelf card and the social card."
     project: manali            # optional, same values as a post's project
     upcoming:                  # optional: titles of the parts not out yet (drafts too), in order
       - "What comes next"
     complete: false            # true once the last part is out; hides "coming soon"
     ---
     Optional intro for the hub page, in Markdown.

   A post joins with `series: <slug>` and `part: <n>` in its front matter. Parts are ordered by
   number. Unwritten parts are the `upcoming` titles, numbered after the last published part.
   Mistakes fail the build, like post front matter does. */

const SERIES_DIR = path.join(process.cwd(), "content", "series");
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;

export type SeriesPart =
  | { part: number; state: "published"; post: Post }
  | { part: number; state: "upcoming"; title: string };

export type Series = {
  slug: string;
  title: string;
  summary: string;
  project: Post["project"];
  intro: string; // raw Markdown, may be empty
  complete: boolean;
  parts: SeriesPart[];
  published: number; // parts that are out
  total: number; // published plus announced
  url: string;
  updated: string; // date of the newest published part, or "" when none is out
};

let cache: Series[] | null = null;

export function getAllSeries(): Series[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const files = fs.existsSync(SERIES_DIR) ? fs.readdirSync(SERIES_DIR).filter((f) => f.endsWith(".md")).sort() : [];
  const all = getAllPosts({ includeDrafts: true });
  const posts = all.filter((p) => !p.draft);
  const known = new Set<string>();

  const series = files.map((file) => {
    const fail = (why: string) => { throw new Error(`content/series/${file}: ${why}`); };
    const slug = file.replace(/\.md$/, "");
    if (!SLUG.test(slug)) fail(`file name "${slug}" must be lowercase letters, digits and dashes`);
    known.add(slug);
    const { data, content } = matter(fs.readFileSync(path.join(SERIES_DIR, file), "utf8"));
    if (!data.title) fail("needs a title");
    if (!data.summary) fail("needs a summary (the hub page, the shelf card and the social card use it)");
    const project = String(data.project || "manali");
    if (!(project in projectLabel)) fail(`project "${project}" is not one of: ${Object.keys(projectLabel).join(", ")}`);
    if (data.upcoming !== undefined && !(Array.isArray(data.upcoming) && data.upcoming.every((t: unknown) => typeof t === "string" && t.trim()))) fail("upcoming must be a list of part titles");
    const complete = data.complete === true;
    const upcomingTitles: string[] = complete ? [] : ((data.upcoming as string[] | undefined) || []).map((t) => t.trim());

    // Every post that names this series, drafts included, so two files can't claim one part.
    const claims = new Map<number, string>();
    for (const p of all.filter((x) => x.series === slug)) {
      const other = claims.get(p.part!);
      if (other) throw new Error(`content/posts: "${p.slug}" and "${other}" are both part ${p.part} of series "${slug}"`);
      claims.set(p.part!, p.slug);
    }

    const out: SeriesPart[] = posts
      .filter((p) => p.series === slug)
      .sort((a, b) => a.part! - b.part!)
      .map((post) => ({ part: post.part!, state: "published" as const, post }));
    // Published parts must run 1, 2, 3 with no gaps: a part can't go out before the one before it.
    // Then the upcoming titles fill the parts after the last published one. Those are the parts
    // not out yet, drafts included, so a draft's slot shows as its coming-soon title.
    out.forEach((p, i) => { if (p.part !== i + 1) fail(`published parts must run 1, 2, 3 in order; part ${i + 1} is not published but part ${p.part} is`); });
    let n = out.length;
    for (const title of upcomingTitles) out.push({ part: ++n, state: "upcoming", title });

    const dates = out.flatMap((p) => (p.state === "published" ? [p.post.date] : [])).sort();
    return {
      slug,
      title: String(data.title),
      summary: String(data.summary),
      project: project as Post["project"],
      intro: content.trim(),
      complete,
      parts: out,
      published: out.filter((p) => p.state === "published").length,
      total: out.length,
      url: `/series/${slug}/`,
      updated: dates.at(-1) || "",
    } satisfies Series;
  });

  for (const p of all) {
    if (p.series && !known.has(p.series)) throw new Error(`content/posts: "${p.slug}" names series "${p.series}", but content/series/${p.series}.md does not exist`);
  }

  // Newest activity first, series with nothing published last.
  cache = series.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0));
  return cache;
}

export function getSeries(slug: string) {
  return getAllSeries().find((s) => s.slug === slug) || null;
}

/* Only series with at least one published part are shown anywhere public. */
export function getPublicSeries() {
  return getAllSeries().filter((s) => s.published > 0);
}

/* The series a post belongs to, where it sits, and what comes after it. */
export function seriesFor(post: Post) {
  if (!post.series) return null;
  const series = getSeries(post.series);
  if (!series) return null;
  const index = series.parts.findIndex((p) => p.state === "published" && p.post.slug === post.slug);
  const next = index >= 0 ? series.parts[index + 1] || null : null;
  return { series, index, next };
}

export function getProjectSeries(project: string) {
  return getPublicSeries().filter((s) => s.project === project);
}

/* What the series components receive: plain, serialisable, in the design system's shape. */
export type PartView = { n: number; slug?: string; title: string; href?: string; summary?: string; date?: string; readTime?: string; soon: boolean };
export type SeriesView = { slug: string; name: string; href: string; summary: string; complete: boolean; parts: PartView[] };

export function seriesView(s: Series): SeriesView {
  return {
    slug: s.slug,
    name: s.title,
    href: s.url,
    summary: s.summary,
    complete: s.complete,
    parts: s.parts.map((p) =>
      p.state === "published"
        ? { n: p.part, slug: p.post.slug, title: p.post.title, href: p.post.url, summary: p.post.summary, date: readableDate(p.post.date), readTime: p.post.readingTime, soon: false }
        : { n: p.part, title: p.title, soon: true },
    ),
  };
}

/* Title only, from one small file: used by the follow endpoint at request time, where the
   whole posts folder isn't needed. Null for a slug that isn't a series. */
export function seriesTitle(slug: string): string | null {
  if (!SLUG.test(slug)) return null;
  const file = path.join(SERIES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const title = matter(fs.readFileSync(file, "utf8")).data.title;
  return title ? String(title) : null;
}
