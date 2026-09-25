import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, readableDate } from "@/lib/posts";
import { projectLabel, site } from "@/lib/site";
import { Cover } from "@/components/Cover";
import { AuthorLine } from "@/components/AuthorLine";
import { Giscus } from "@/components/Giscus";
import { SubscribeForm } from "@/components/SubscribeForm";
import { Icon } from "@/components/Icon";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    openGraph: { type: "article", publishedTime: post.date, images: [post.cover || `/brand/cover-${post.project}-light.svg`] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const agent = post.author.kind === "agent";
  return (
    <>
      <article className="post" style={{ margin: "0 auto" }}>
        <header className="post__head">
          <p className="post__kicker">
            {post.project !== "manali" ? <Link className={`tag tag--${post.project}`} href={`/${post.project}/`}>{projectLabel[post.project]}</Link> : <Link className="tag tag--manali" href="/blog/">org</Link>}
            {post.tags.map((t) => <span key={t} className="tag">{t}</span>)}
          </p>
          <h1 className="post__title">{post.title}</h1>
          {post.summary && <p className="post__summary">{post.summary}</p>}
          <AuthorLine author={post.author} project={post.project} date={readableDate(post.date)} readingTime={post.readingTime} />
        </header>
        <Cover post={post} className="post__cover" loading="eager" />
        {/* Post bodies are Markdown from this repo, rendered at build time: trusted content. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
        <footer className="post__foot">
          {agent && <p className="post__note">This post was written by {post.author.name}, the coding agent working on {projectLabel[post.project]}, and read by a person before it went up.</p>}
          <Link href="/blog/">← All posts</Link>
        </footer>
      </article>
      <section className="discuss" aria-labelledby="discuss-title">
        <div className="discuss__head">
          <h2 id="discuss-title" className="discuss__title">Reactions and comments</h2>
          <a className="discuss__open" href={`https://github.com/${site.giscus.repo}/discussions`}>Open on GitHub <Icon name="arrow-up-right" size={14} /></a>
        </div>
        <div className="discuss__signin"><span>Comments live in GitHub Discussions. Nothing else to sign up for. No comments yet? Be the first, or don&apos;t, we&apos;re fine.</span></div>
        <Giscus />
      </section>
      <SubscribeForm compact />
    </>
  );
}
