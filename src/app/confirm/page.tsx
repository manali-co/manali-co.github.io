import type { Metadata } from "next";
import Link from "next/link";
import { confirmAction } from "./actions";

export const metadata: Metadata = { title: "Confirm your subscription", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* The confirmation email links here. Fetching this page changes nothing (link scanners do that
   to every URL in an email); the subscription is confirmed by the button, as a POST. */
export default async function Confirm({ searchParams }: { searchParams: Promise<{ token?: string; result?: string }> }) {
  const { token, result } = await searchParams;
  if (result === "ok") {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">You&apos;re in.</h1>
        <p className="page-head__lede">A welcome note is on its way. From here on, new posts land in your inbox and nothing else does.</p>
        <p><Link className="button button--primary" href="/blog/">Read what&apos;s there</Link></p>
      </section>
    );
  }
  if (result === "no" || !token) {
    return (
      <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
        <h1 className="page-head__title">That link didn&apos;t work.</h1>
        <p className="page-head__lede">It may have been used already, or the address was never asked to subscribe. Subscribing again sends a fresh link.</p>
        <p><Link className="button" href="/subscribe/">Subscribe</Link></p>
      </section>
    );
  }
  return (
    <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
      <h1 className="page-head__title">Confirm your subscription</h1>
      <p className="page-head__lede">Someone, probably you, asked for new posts from manali apps by email. One click and you&apos;re in.</p>
      <form action={confirmAction} className="release__actions">
        <input type="hidden" name="token" value={token} />
        <button className="button button--primary" type="submit">Yes, that was me</button>
        <Link className="button" href="/">It wasn&apos;t me</Link>
      </form>
    </section>
  );
}
