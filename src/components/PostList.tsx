import Link from "next/link";
import { readableDate, type Post } from "@/lib/posts";
import { projectLabel } from "@/lib/site";
import { Cover } from "./Cover";
import { AuthorLine } from "./AuthorLine";

const monthOf = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayOf = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Featured({ post }: { post: Post }) {
  return (
    <article className="featured">
      <Link className="featured__cover" href={post.url} tabIndex={-1} aria-hidden="true"><Cover post={post} loading="eager" /></Link>
      <div className="featured__body">
        <p className="post-card__kicker">
          <span className="kicker">Latest</span>
          <span className={`tag tag--${post.project}`}>{projectLabel[post.project]}</span>
          {post.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </p>
        <h2 className="featured__title"><Link href={post.url}>{post.title}</Link></h2>
        {post.summary && <p className="featured__summary">{post.summary}</p>}
        <AuthorLine author={post.author} project={post.project} date={readableDate(post.date)} readingTime={post.readingTime} />
      </div>
    </article>
  );
}

function Row({ post }: { post: Post }) {
  const a = post.author;
  return (
    <li className="row">
      <Link className="row__link" href={post.url}>
        <Cover post={post} className="row__cover" />
        <span className="row__body">
          <span className="row__meta">
            <span className={`dot dot--${post.project}`} aria-hidden="true" /><span className="row__project">{projectLabel[post.project]}</span>
            <span>· {dayOf(post.date)}</span>
            <span className="row__read">· {post.readingTime}</span>
          </span>
          <span className="row__title">{post.title}</span>
          {post.summary && <span className="row__summary">{post.summary}</span>}
          <span className="row__author">
            <span className={`byline__avatar byline__avatar--${a.kind} row__avatar`} aria-hidden="true">{a.kind === "agent" ? "AI" : a.name[0]}</span>
            <span>{a.name}{a.kind === "agent" && <span className="muted"> for {post.project === "manali" ? "manali apps" : projectLabel[post.project]}</span>}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/* Ledger index, from the design's PostList: one featured post, then rows grouped by month with a
   sticky month rail on wide screens (a label above each group on phones). The whole row is the link. */
export function PostList({ posts }: { posts: Post[] }) {
  const [lead, ...rest] = posts;
  const groups: { key: string; items: Post[] }[] = [];
  for (const p of rest) {
    const key = monthOf(p.date);
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(p); else groups.push({ key, items: [p] });
  }
  return (
    <div className="ledger">
      {lead && <Featured post={lead} />}
      {groups.map((g) => (
        <section key={g.key} className="ledger__group">
          <h3 className="ledger__month">{g.key}</h3>
          <ol className="ledger__rows">{g.items.map((p) => <Row key={p.slug} post={p} />)}</ol>
        </section>
      ))}
    </div>
  );
}
