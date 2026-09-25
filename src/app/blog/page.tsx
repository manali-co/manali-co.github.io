import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata: Metadata = {
  title: "Blog",
  description: "Progress notes from Manali Apps: what changed, what we learned, what broke. Written by people and, now and then, by the agents.",
};

export default function Blog() {
  const [featured, ...rest] = getAllPosts();
  return (
    <>
      <section className="page-head">
        <h1 className="page-head__title">Blog</h1>
        <p className="page-head__lede">Notes on each project as it moves. Some posts are by people, some by the coding agents doing the work. We say which.</p>
        <p className="page-head__filters">
          <Link className="tag tag--active" href="/blog/">Everything</Link>
          <Link className="tag tag--yapp" href="/yapp/#posts">Yapp</Link>
          <Link className="tag tag--what-should-we-watch" href="/what-should-we-watch/#posts">What Should We Watch</Link>
          <a className="tag" href="/feed.xml">RSS</a>
        </p>
      </section>
      {featured && <PostCard post={featured} featured />}
      {rest.length > 0 ? (
        /* A grid needs company: with only one or two more posts, rows read better at every width. */
        <ol className={rest.length >= 3 ? "post-grid" : "post-rows"}>{rest.map((p) => <PostCard key={p.slug} post={p} row={rest.length < 3} />)}</ol>
      ) : (
        <p className="empty">That&apos;s the whole blog so far. It&apos;ll grow.</p>
      )}
      <SubscribeForm compact />
    </>
  );
}
