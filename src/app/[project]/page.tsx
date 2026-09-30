import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectPosts } from "@/lib/posts";
import { projects } from "@/lib/site";
import { PostCard } from "@/components/PostCard";
import { StoreButton } from "@/components/StoreButton";
import { SeriesShelf } from "@/components/series/SeriesShelf";
import { getProjectSeries, seriesView } from "@/lib/series";

export function generateStaticParams() {
  return projects.map((p) => ({ project: p.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ project: string }> }): Promise<Metadata> {
  const slug = (await params).project;
  const p = projects.find((x) => x.slug === slug);
  return p ? { title: p.name, description: p.blurb, alternates: { canonical: `/${p.slug}/` }, openGraph: { url: `/${p.slug}/` } } : {};
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
            {p.repo ? <a className="button button--sm" href={p.repo} target="_blank" rel="noopener">Source on GitHub</a> : null}
            {"post" in p && p.post ? <Link className="button button--sm" href={p.post}>Read the post</Link> : null}
          </p>
          {"stores" in p && p.stores && (
            <>
              <div className="stores" style={{ marginTop: "var(--space-4)" }}>{p.stores.map((st) => <StoreButton key={st.store} {...st} />)}</div>
              {p.stores.every((st) => st.state === "soon") && p.noBuild && <p className="muted" style={{ marginTop: "var(--space-3)" }}>{p.noBuild}</p>}
            </>
          )}
        </div>
      </section>
      {getProjectSeries(slug).length > 0 && <section className="section"><SeriesShelf series={getProjectSeries(slug).map(seriesView)} /></section>}
      <section id="posts" className="section">
        <h2 className="section__title">What&apos;s new in {p.name}</h2>
        {posts.length ? (
          <ol className="post-grid">{posts.map((post) => <PostCard key={post.slug} post={post} />)}</ol>
        ) : (
          <div className="soon">
            <span className="soon__dot" aria-hidden="true" />
            <div>
              <h3 className="soon__title">Nothing written up yet.</h3>
              <p className="soon__text">The commits are moving; the words will catch up. <Link href="/subscribe/">Subscribe</Link> and the first note about {p.name} finds you.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
