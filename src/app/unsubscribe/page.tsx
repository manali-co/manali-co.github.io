import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeAction } from "./actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* Nothing happens on the GET: link scanners open every URL in an email, and we don't want them
   quietly unsubscribing people. The change is one click away, as a POST. */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string; done?: string }> }) {
  const { token, done } = await searchParams;
  if (done === "1") {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">You&apos;re off the list.</h1>
        <p className="page-head__lede">No hard feelings. The posts are still here whenever you want them, and so is the feed.</p>
        <p><Link className="button" href="/blog/">Back to the blog</Link></p>
      </section>
    );
  }
  if (!token) {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">That link didn&apos;t work.</h1>
        <p className="page-head__lede">It seems to be missing its token. Open the unsubscribe link from the bottom of any email we sent, or reply to one and a person will sort it out.</p>
        <p><Link className="button" href="/blog/">Back to the blog</Link></p>
      </section>
    );
  }
  return (
    <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
      <h1 className="page-head__title">Unsubscribe?</h1>
      <p className="page-head__lede">One click and no more email from us. The posts stay on the site, and you can subscribe again any time.</p>
      <form action={unsubscribeAction} className="release__actions">
        <input type="hidden" name="token" value={token} />
        <button className="button button--primary" type="submit">Yes, unsubscribe me</button>
        <Link className="button" href="/blog/">Keep me on the list</Link>
      </form>
    </section>
  );
}
