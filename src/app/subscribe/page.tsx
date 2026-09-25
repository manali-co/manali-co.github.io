import type { Metadata } from "next";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ConfirmedNote } from "@/components/ConfirmedNote";

export const metadata: Metadata = { title: "Subscribe", description: "New posts by email. No spam, no schedule, unsubscribe in one click." };

export default function Subscribe() {
  return (
    <>
      <section className="page-head">
        <h1 className="page-head__title">Subscribe</h1>
        <p className="page-head__lede">Every new post lands in your inbox, and nothing else does. We don&apos;t sell the list, we don&apos;t do &quot;digests&quot;, and the unsubscribe link actually works.</p>
      </section>
      <ConfirmedNote />
      <SubscribeForm />
      <p className="muted" style={{ maxWidth: "60ch", marginBottom: "var(--space-10)" }}>Prefer a feed reader? There&apos;s an <a href="/feed.xml">Atom feed</a>. Prefer GitHub? Watch the repos. Prefer nothing? Also fine.</p>
    </>
  );
}
