import type { Metadata } from "next";
import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata: Metadata = { title: "Subscribe", description: "New posts by email. No spam, no schedule, unsubscribe in one click." };

export default async function Subscribe({ searchParams }: { searchParams: Promise<{ confirmed?: string }> }) {
  const { confirmed } = await searchParams;
  return (
    <>
      <section className="page-head">
        <h1 className="page-head__title">Subscribe</h1>
        <p className="page-head__lede">Every new post lands in your inbox, and nothing else does. We don&apos;t sell the list, we don&apos;t do &quot;digests&quot;, and the unsubscribe link actually works.</p>
      </section>
      {confirmed === "1" && <p className="subscribe__status subscribe__status--ok" role="status">Confirmed. You&apos;re in; the next post lands in your inbox.</p>}
      {confirmed === "0" && <p className="subscribe__status subscribe__status--err" role="status">That confirmation link didn&apos;t work. It may have been used already; try subscribing again.</p>}
      <SubscribeForm />
      <p className="muted" style={{ maxWidth: "60ch", marginBottom: "var(--space-10)" }}>Prefer a feed reader? There&apos;s an <a href="/feed.xml">Atom feed</a>. Prefer GitHub? Watch the repos. Prefer nothing? Also fine.</p>
    </>
  );
}
