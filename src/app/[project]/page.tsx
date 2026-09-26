import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectPosts } from "@/lib/posts";
import { projects } from "@/lib/site";
import { PostCard } from "@/components/PostCard";

export function generateStaticParams() {
  return projects.map((p) => ({ project: p.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ project: string }> }): Promise<Metadata> {
  const slug = (await params).project;
  const p = projects.find((x) => x.slug === slug);
  return p ? { title: p.name, description: p.blurb } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const slug = (await params).project;
  const p = projects.find((x) => x.slug === slug);
  if (!p) notFound();
  const posts = getProjectPosts(slug);
  return (
    <>
      <section className={`page-head page-head--project page-head--${p.well}`}>
        <img className="page-head__icon" src={p.icon} alt="" width={96} height={96} />
        <div>
          <h1 className="page-head__title">{p.name} <span className="card__platform">{p.platform}</span></h1>
          <p className="page-head__lede">{p.blurb}</p>
          <p className="card__meta">
            <span className={`badge badge--${p.status}`}>{p.statusLabel}</span>
            <span className="badge badge--quiet">{p.license}</span>
            {"live" in p && p.live ? <a className="button button--primary button--sm" href={p.live} target="_blank" rel="noopener">Try it</a> : null}
            <a className="button button--sm" href={p.repo} target="_blank" rel="noopener">Source on GitHub</a>
          </p>
        </div>
      </section>
      <section id="posts" className="section">
        <h2 className="section__title">What&apos;s new in {p.name}</h2>
        {posts.length ? (
          <ol className="post-grid">{posts.map((post) => <PostCard key={post.slug} post={post} />)}</ol>
        ) : (
          <p className="empty">Nothing written up yet. The commits are moving; the words will catch up. <Link href="/blog/">Read the rest of the blog</Link> meanwhile.</p>
        )}
      </section>
    </>
  );
}
