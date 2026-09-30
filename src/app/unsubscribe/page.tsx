import type { Metadata } from "next";
import Link from "next/link";
import { seriesTitle } from "@/lib/series";
import { unsubscribeAction } from "./actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* Nothing happens on the GET: link scanners open every URL in an email, and we don't want them
   quietly unsubscribing people. The change is one click away, as a POST. With `series` (from a
   series follower's email), it stops just that series and keeps anything else they follow. */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string; done?: string; series?: string; failed?: string }> }) {
  const { token, done, series, failed } = await searchParams;
  const retry = failed === "1" && <p className="subscribe__status subscribe__status--err" role="alert">That didn&apos;t go through on our side. Nothing changed yet; try again in a minute.</p>;
  const name = series ? seriesTitle(series) : null;
  if (done === "series" && name) {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">No more {name}.</h1>
        <p className="page-head__lede">You won&apos;t get the next parts by email. Anything else you follow stays as it was, and the series is still on the site.</p>
        <p><Link className="button" href={`/series/${series}/`}>See the series</Link></p>
      </section>
    );
  }
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
  if (name) {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">Stop following {name}?</h1>
        <p className="page-head__lede">One click and the next parts stop coming. Anything else you follow stays.</p>
        {retry}
        <form action={unsubscribeAction} className="release__actions">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="series" value={series} />
          <button className="button button--primary" type="submit">Yes, stop this series</button>
          <Link className="button" href={`/series/${series}/`}>Keep following</Link>
        </form>
        <p className="muted">Want no email at all? <Link href={`/unsubscribe/?token=${encodeURIComponent(token)}`}>Unsubscribe from everything</Link>.</p>
      </section>
    );
  }
  return (
    <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
      <h1 className="page-head__title">Unsubscribe?</h1>
      <p className="page-head__lede">One click and no more email from us. The posts stay on the site, and you can subscribe again any time.</p>
      {retry}
      <form action={unsubscribeAction} className="release__actions">
        <input type="hidden" name="token" value={token} />
        <button className="button button--primary" type="submit">Yes, unsubscribe me</button>
        <Link className="button" href="/blog/">Keep me on the list</Link>
      </form>
    </section>
  );
}
