import type { Metadata } from "next";
import { requireOwner } from "@/lib/admin";
import { adminStats } from "@/lib/backend";
import { getAllPosts, readableDate } from "@/lib/posts";
import { site } from "@/lib/site";
import { AnnounceCard } from "./AnnounceCard";

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
  const [stats, latest] = [await adminStats(), getAllPosts()[0]];
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
          <p className="stat__label">{stats ? "confirmed addresses" : "backend not reachable; set API_BASE_URL and API_KEY"}</p>
          {stats && stats.recent.length > 0 && (
            <ul className="list">
              {stats.recent.slice(0, 8).map((r) => (
                <li key={r.email}><span>{r.email}</span><span className="muted">{r.confirmed ? "confirmed" : "pending"} · {readableDate(r.created.slice(0, 10))}</span></li>
              ))}
            </ul>
          )}
        </div>
        <AnnounceCard post={latest ? { slug: latest.slug, title: latest.title, summary: latest.summary, url: site.url + latest.url, cover: latest.cover ? site.url + latest.cover : undefined, author: latest.author.kind === "agent" ? `${latest.author.name}, coding agent` : latest.author.name } : null} lastEmail={stats?.lastEmail} />
        <div className="panel">
          <h2 className="panel__title">Recent comments</h2>
          <p className="muted">Comments and reactions live in GitHub Discussions. Moderate them there; nothing to sync.</p>
          <p><a className="button button--sm" href={`https://github.com/${site.giscus.repo}/discussions`}>Open Discussions</a></p>
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
