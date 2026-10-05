import Link from "next/link";
import { readableDate, type Post } from "@/lib/posts";
import { projectLabel } from "@/lib/site";
import { Cover } from "./Cover";
import { AuthorLine } from "./AuthorLine";

export function ProjectTag({ project }: { project: string }) {
  return <span className={`tag tag--${project}`}>{projectLabel[project] || project}</span>;
}

/* Featured titles longer than this step down to the h2 scale and stack the card, a 2:1 cover
   above the text, so the cover never shrinks beside a tall title (design system: LONG_TITLE). */
export const LONG_TITLE = 60;
export const featuredClass = (title: string) => `featured ${title.length > LONG_TITLE ? "featured--long" : ""}`;

export function PostCard({ post, featured = false, row = false }: { post: Post; featured?: boolean; row?: boolean }) {
  if (featured) {
    return (
      <article className={featuredClass(post.title)}>
        <Link className="featured__cover" href={post.url} tabIndex={-1} aria-hidden="true"><Cover post={post} loading="eager" /></Link>
        <div className="featured__body">
          <p className="post-card__kicker"><ProjectTag project={post.project} /><span className="post-card__date">{readableDate(post.date)}</span></p>
          <h2 className="featured__title"><Link href={post.url}>{post.title}</Link></h2>
          {post.summary && <p className="featured__summary">{post.summary}</p>}
          <div className="post-card__meta"><AuthorLine author={post.author} project={post.project} compact /><span>{post.readingTime}</span></div>
        </div>
      </article>
    );
  }
  return (
    <li className={`post-card ${row ? "post-card--row" : "post-card--grid"}`}>
      <Link className="post-card__cover" href={post.url} tabIndex={-1} aria-hidden="true"><Cover post={post} /></Link>
      <div className="post-card__body">
      <p className="post-card__kicker"><ProjectTag project={post.project} /><span className="post-card__date">{readableDate(post.date)}</span></p>
      <h2 className="post-card__title"><Link href={post.url}>{post.title}</Link></h2>
      {post.summary && <p className="post-card__summary">{post.summary}</p>}
      <div className="post-card__meta"><AuthorLine author={post.author} project={post.project} compact /><span>{post.readingTime}</span></div>
      </div>
    </li>
  );
}
