import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/admin";
import { adminReplies, adminStats } from "@/lib/backend";
import { removeReply } from "./actions";
import { getAllPosts, readableDate } from "@/lib/posts";
import { projectLabel, site } from "@/lib/site";
import { AnnounceCard } from "./AnnounceCard";
import { seriesFor } from "@/lib/series";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  const { ok, user } = await requireOwner();
  if (!ok) {
    return (
      <section className="signin">
        <h1 className="page-head__title">Not this account.</h1>
        <p className="muted">You&apos;re signed in as {user?.emailAddresses?.[0]?.emailAddress || "someone"}, which isn&apos;t on the owner list. Nothing here for you, sorry.</p>
      </section>
    );
  }
  const [stats, replies, latest] = [await adminStats(), await adminReplies(), getAllPosts()[0]];
  const latestSeries = latest ? seriesFor(latest)?.series : undefined; // its followers get the email too
  return (
    <section className="admin">
      <div className="section__head">
        <h1 className="page-head__title">Admin</h1>
        <span className="muted">Hi {user?.firstName || "there"}. Plain and calm, as promised.</span>
      </div>
      <div className="admin__grid">
        <div className="panel">
          <h2 className="panel__title">Subscribers</h2>
          <p className="stat">{stats ? stats.subscribers : "—"}</p>
          <p className="stat__label">{stats ? `confirmed addresses${stats.pending ? ` · ${stats.pending} waiting to confirm` : ""}` : "backend not reachable; set API_BASE_URL, API_KEY and ADMIN_API_KEY"}</p>
          {stats && stats.recent.length > 0 && (
            <ul className="list">
              {stats.recent.slice(0, 8).map((r) => (
                <li key={r.email}><span>{r.email}</span><span className="muted">{r.confirmed ? "confirmed" : "pending"} · {readableDate(r.created.slice(0, 10))}</span></li>
              ))}
            </ul>
          )}
        </div>
        <AnnounceCard post={latest ? { slug: latest.slug, title: latest.title, summary: latest.summary, url: site.url + latest.url, cover: `${site.url}/blog/${latest.slug}/opengraph-image`, coverText: latest.coverText, project: latest.project, date: readableDate(latest.date), author: latest.author.kind === "agent" ? `${latest.author.name} for ${projectLabel[latest.project] || "manali apps"} · by ${latest.author.owner}` : latest.author.name, ...(latestSeries ? { series: latestSeries.slug, seriesTitle: latestSeries.title } : {}) } : null} lastEmail={stats?.lastEmail} />
        <div className="panel">
          <h2 className="panel__title">Replies {replies ? <span className="muted">· {replies.length}</span> : null}</h2>
          {!replies ? <p className="muted">Backend not reachable.</p> : replies.length === 0 ? <p className="muted">No replies yet. They land here and in your inbox.</p> : (
            <ul className="list">
              {replies.map((r) => (
                <li key={r.id} style={{ display: "grid", gap: 4, alignItems: "start" }}>
                  <span>{r.text}</span>
                  <span className="muted">
                    {r.name || "Someone"}{r.email ? <> · <a href={`mailto:${r.email}?subject=${encodeURIComponent("Re: your reply on manali apps")}`}>{r.email}</a></> : " · no email"} · <Link href={`/blog/${r.slug}/`}>{r.slug}</Link> · {readableDate(r.created.slice(0, 10))}
                  </span>
                  <form action={removeReply}><input type="hidden" name="slug" value={r.slug} /><input type="hidden" name="id" value={r.id} /><button className="button button--sm" type="submit">Delete</button></form>
                </li>
              ))}
            </ul>
          )}
          <p className="muted">Public comments stay in <a href={`https://github.com/${site.giscus.repo}/discussions`}>GitHub Discussions</a>.</p>
        </div>
        <div className="panel">
          <h2 className="panel__title">Site health</h2>
          <ul className="list">
            <li><span>Last email sent</span><span className="muted">{stats?.lastEmail ? `${readableDate(stats.lastEmail.sent.slice(0, 10))} · ${stats.lastEmail.recipients} recipients` : "never"}</span></li>
            <li><span>Latest post</span><span className="muted">{latest ? readableDate(latest.date) : "none"}</span></li>
            <li><span>Deploys</span><a className="muted" href="https://vercel.com">Vercel</a></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
