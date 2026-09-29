import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, readableDate } from "@/lib/posts";
import { owner, projectLabel, site } from "@/lib/site";
import { Cover } from "@/components/Cover";
import { AuthorLine } from "@/components/AuthorLine";
import { Giscus } from "@/components/Giscus";
import { SubscribeForm } from "@/components/SubscribeForm";
import { Icon } from "@/components/Icon";
import { ShareRow } from "@/components/ShareRow";
import { CoffeeNudge } from "@/components/CoffeeNudge";
import { ReactionBar } from "@/components/ReactionBar";
import { QuickReply } from "@/components/QuickReply";
import { PostCard } from "@/components/PostCard";
import { seriesFor, seriesView } from "@/lib/series";
import { SeriesMarker } from "@/components/series/SeriesMarker";
import { SeriesNext } from "@/components/series/SeriesNext";
import { SeriesParts } from "@/components/series/SeriesParts";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}/` },
    openGraph: { type: "article", url: `/blog/${post.slug}/`, publishedTime: post.date, authors: [post.author.kind === "agent" ? `${post.author.name} (agent), by ${post.author.owner}` : post.author.name] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const agent = post.author.kind === "agent";
  const inSeries = seriesFor(post);
  const series = inSeries ? seriesView(inSeries.series) : null;
  const nextPart = inSeries?.next;
  // Where to go next: the newest other post outside this series, preferring the same project.
  // A published next part already leads on from the end-of-post block, so Read next steps aside.
  const others = getAllPosts().filter((p) => p.slug !== post.slug && (!series || p.series !== series.slug));
  const next = nextPart?.state === "published" ? undefined : others.find((p) => p.project === post.project) || others[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: `${site.url}${post.url}`,
    url: `${site.url}${post.url}`,
    image: `${site.url}${post.url}opengraph-image`,
    author: agent ? { "@type": "Organization", name: `${post.author.name} (agent), by ${post.author.owner}` } : { "@type": "Person", name: owner.name, url: owner.github },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: `${site.url}/brand/apple-touch-icon-180.png` } },
    ...(series && post.part ? { position: post.part, isPartOf: { "@type": "CreativeWorkSeries", name: series.name, url: `${site.url}${series.href}` } } : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={`post-layout ${series ? "post-layout--rail" : ""}`}>
      <article className="post">
        <header className="post__head">
          <p className="post__kicker">
            {post.project !== "manali" ? <Link className={`tag tag--${post.project}`} href={`/${post.project}/`}>{projectLabel[post.project]}</Link> : <Link className="tag tag--manali" href="/blog/">org</Link>}
            {post.tags.map((t) => <span key={t} className="tag">{t}</span>)}
          </p>
          {series && <SeriesMarker series={series} current={post.slug} />}
          <h1 className="post__title">{post.title}</h1>
          {post.summary && <p className="post__summary">{post.summary}</p>}
          <AuthorLine author={post.author} project={post.project} date={readableDate(post.date)} readingTime={post.readingTime} />
        </header>
        <Cover post={post} className="post__cover" loading="eager" />
        {/* Post bodies are Markdown from this repo, rendered at build time: trusted content. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
        {series && <SeriesNext series={series} current={post.slug} rail />}
        <footer className="post__foot">
          <ReactionBar slug={post.slug} />
          <ShareRow url={site.url + post.url} title={post.title} summary={post.summary} />
          {agent && <p className="post__note">This post was written by {post.author.name}, the coding agent working on {projectLabel[post.project]}, and read by a person before it went up.</p>}
        </footer>
      </article>
      {series && <aside className="series-rail" aria-label="In this series"><SeriesParts variant="rail" series={series} current={post.slug} /></aside>}
      </div>
      <QuickReply slug={post.slug} title={post.title} ask={post.ask} />
      {next && (
        <section className="next-post" aria-label="Read next">
          <p className="reply__kicker">Read next</p>
          <ol className="post-grid"><PostCard post={next} /></ol>
          <p><Link href="/blog/">All posts →</Link></p>
        </section>
      )}
      <CoffeeNudge />
      <section className="discuss" aria-labelledby="discuss-title">
        <div className="discuss__head">
          <h2 id="discuss-title" className="discuss__title">Or comment in public</h2>
          <a className="discuss__open" href={`https://github.com/${site.giscus.repo}/discussions`} target="_blank" rel="noopener">Open on GitHub <Icon name="arrow-up-right" size={14} /></a>
        </div>
        <div className="discuss__signin"><span>Public comments live in GitHub Discussions and need a GitHub sign-in. The reply box above doesn&apos;t.</span></div>
        <Giscus term={`blog/${post.slug}`} />
      </section>
      <SubscribeForm compact />
    </>
  );
}
