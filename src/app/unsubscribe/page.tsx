import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribe } from "@/lib/backend";

export const metadata: Metadata = { title: "Unsubscribed", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await unsubscribe(token) : false;
  return (
    <section className="page-head" style={{ paddingBottom: "var(--space-10)" }}>
      <h1 className="page-head__title">{ok ? "You're off the list." : "That link didn't work."}</h1>
      <p className="page-head__lede">
        {ok
          ? "No hard feelings. The posts are still here whenever you want them, and so is the feed."
          : "It may have expired or been used already. If you still get email from us, reply to it and a person will sort it out."}
      </p>
      <p><Link className="button" href="/blog/">Back to the blog</Link></p>
    </section>
  );
}
