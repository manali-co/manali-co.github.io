import type { Metadata } from "next";
import Link from "next/link";
import { stopAction } from "./actions";

export const metadata: Metadata = { title: "Stop reply emails", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* The stop link in a comment-reply email. Nothing happens on the GET (link scanners open every
   URL in an email); the change is one press away, as a POST. */
export default async function StopReplies({ searchParams }: { searchParams: Promise<{ post?: string; id?: string; token?: string; done?: string; error?: string }> }) {
  const { post = "", id, token, done, error } = await searchParams;
  const back = /^[a-z0-9][a-z0-9-]{0,120}$/.test(post) ? `/blog/${post}/#comments` : "/blog/";
  if (done === "1") {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">No more reply emails.</h1>
        <p className="page-head__lede">Replies to that comment stay on the post; they just won&apos;t reach your inbox.</p>
        <p><Link className="button" href={back}>Back to the post</Link></p>
      </section>
    );
  }
  if (!id || !token || error === "link") {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">That link didn&apos;t work.</h1>
        <p className="page-head__lede">It seems to be missing a part. Open the stop link from the bottom of the reply email again.</p>
        <p><Link className="button" href="/blog/">Back to the blog</Link></p>
      </section>
    );
  }
  return (
    <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
      <h1 className="page-head__title">Stop reply emails?</h1>
      <p className="page-head__lede">You asked for an email when someone replies to your comment. One press and they stop.</p>
      {error === "retry" && <p className="subscribe__status subscribe__status--err" role="alert">That didn&apos;t go through on our side. Nothing changed yet; try again in a minute.</p>}
      <form action={stopAction} className="release__actions">
        <input type="hidden" name="post" value={post} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="token" value={token} />
        <button className="button button--primary" type="submit">Yes, stop them</button>
        <Link className="button" href={back}>Keep them coming</Link>
      </form>
    </section>
  );
}
