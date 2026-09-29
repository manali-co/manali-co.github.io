import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What manali.page keeps about visitors, and what it doesn't.",
  alternates: { canonical: "/privacy/" },
};

/* Plain language, kept short, and true to the code. Update it with any change to telemetry,
   reactions, replies or email. */
export default function Privacy() {
  return (
    <article className="post" style={{ margin: "0 auto" }}>
      <header className="post__head">
        <h1 className="post__title">Privacy</h1>
        <p className="post__summary">No cookies, no ad trackers, nothing sold. Here is exactly what this site keeps.</p>
      </header>
      <div className="prose">
        <h2>Reading</h2>
        <p>Pages you view, what you click, how long a page stays in front and how far you scroll go to Microsoft Application Insights, so we can see what works. Your browser keeps a random id for this in local storage (not a cookie) so a return visit counts as one reader. It is not tied to your name, email or account, and query strings are stripped before anything is sent. Clearing site data resets it.</p>
        <h2>Reactions and replies</h2>
        <p>Reactions and replies use a second random id, also in local storage, so a second tap removes your reaction and so replies can be rate-limited. It is a different value from the reading id, so the two can&apos;t be joined. A reply is sent privately to Ayush and is never published. If you leave a name or email with it, they are used only to answer you.</p>
        <h2>Email</h2>
        <p>If you subscribe, we keep your address to send new posts, through Resend. Unsubscribing deletes it. Addresses that never confirm are deleted after seven days.</p>
        <h2>Comments</h2>
        <p>Public comments are GitHub Discussions, loaded from giscus. GitHub&apos;s own privacy terms apply there.</p>
        <p>Questions, or want something deleted? <Link href="/subscribe/">Reply to any email</Link>, or use the reply box on any post.</p>
      </div>
    </article>
  );
}
