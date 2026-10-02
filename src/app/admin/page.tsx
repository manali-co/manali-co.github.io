import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/admin";
import { adminAnnouncements, adminComments, adminData, adminReplies, adminStats, type AnnouncePost, type Announcement } from "@/lib/backend";
import { removeReply } from "./actions";
import { CommentActions } from "./CommentActions";
import { getAllPosts, readableDate, type Post } from "@/lib/posts";
import { projectLabel, site } from "@/lib/site";
import { AnnouncementsPanel, type AnnounceRow } from "./AnnouncementsPanel";
import { seriesFor } from "@/lib/series";
import { StoredDataPanel } from "./StoredDataPanel";
import { TrafficPanel } from "./TrafficPanel";

/* What the email needs about a post. Series followers get it too, so the series part rides along. */
function emailPost(p: Post): AnnouncePost {
  const inSeries = seriesFor(p);
  const agent = p.author.kind === "agent";
  const label = projectLabel[p.project] || "manali apps";
  return {
    slug: p.slug, title: p.title, summary: p.summary, url: site.url + p.url, cover: `${site.url}/blog/${p.slug}/opengraph-image`, coverText: p.coverText,
    project: p.project, date: readableDate(p.date), readTime: p.readingTime,
    author: agent ? `${p.author.name} for ${label} · by ${p.author.owner}` : p.author.name,
    authorKind: agent ? "agent" : "person", authorName: p.author.name, authorOwner: agent ? p.author.owner : undefined,
    ...(inSeries && p.part ? { series: inSeries.series.slug, seriesTitle: inSeries.series.title, seriesPart: p.part, seriesTotal: inSeries.series.total, seriesUrl: site.url + inSeries.series.url } : {}),
  };
}

/* Times in the owner's zone, the same on the server and in the browser. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function sentAt(iso: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/New_York" })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${parts.day} ${MONTHS[Number(parts.month) - 1]}, ${parts.hour}:${parts.minute}`;
}

function sendOf(all: Announcement[], slug: string): AnnounceRow["send"] {
  const a = all.find((x) => x.slug === slug); // newest first, so a re-send shows its latest copy
  if (!a) return null;
  const to = a.to;
  return to ? { at: sentAt(a.sent), total: a.subscribers ?? to.length, failed: to.filter((t) => !t.ok).length, kept: true, recipients: to } : { at: sentAt(a.sent), total: a.recipients, failed: 0, kept: false, recipients: [] };
}

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  const { ok, user } = await requireOwner();
  if (!user) redirect("/sign-in/");
  if (!ok) {
    return (
      <section className="signin">
        <h1 className="page-head__title">Not this account.</h1>
        <p className="muted">You&apos;re signed in as {user.email || "someone"}, which isn&apos;t on the owner list. Nothing here for you, sorry.</p>
      </section>
    );
  }
  const [stats, replies, comments, sends, stored] = await Promise.all([adminStats(), adminReplies(), adminComments(), adminAnnouncements(), adminData()]);
  const posts = getAllPosts();
  const latest = posts[0];
  const rows: AnnounceRow[] = posts.map((p) => ({ post: emailPost(p), send: sends ? sendOf(sends, p.slug) : null }));
  const held = (comments || []).filter((c) => c.state === "pending");
  const recent = (comments || []).filter((c) => c.state === "live").slice(0, 20);
  return (
    <section className="admin">
      <div className="section__head">
        <h1 className="page-head__title">Admin</h1>
        <span className="muted">Hi {user.name.split(" ")[0] || "there"}. Plain and calm, as promised.</span>
        <form action="/api/auth/signout/" method="post"><button className="button button--sm button--ghost" type="submit">Sign out</button></form>
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
        <div className="panel">
          <h2 className="panel__title">Comments {comments ? <span className="muted">· {held.length} waiting</span> : null}</h2>
          {!comments ? <p className="muted">Backend not reachable.</p> : held.length + recent.length === 0 ? <p className="muted">No comments yet. A browser&apos;s first comment waits here for you; after you approve one, that browser posts straight away.</p> : (
            <ul className="list">
              {[...held, ...recent].map((c) => (
                <li key={c.id} style={{ display: "grid", gap: 6, alignItems: "start" }}>
                  <span style={{ whiteSpace: "pre-wrap" }}>{c.text}</span>
                  <span className="muted">
                    {c.owner ? "You" : c.name || "A reader"}{c.email ? <> · <a href={`mailto:${c.email}`}>{c.email}</a></> : ""} · <Link href={`/blog/${c.slug}/#comments`}>{c.title || c.slug}</Link>{c.parent ? " · reply" : ""} · {readableDate(c.created.slice(0, 10))}
                    {c.state === "pending" ? <> · <b>waiting</b></> : null}
                  </span>
                  <CommentActions slug={c.slug} id={c.id} title={c.title} pending={c.state === "pending"} canReply={c.state === "live" && !c.owner} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <AnnouncementsPanel rows={rows} subscribers={stats ? stats.subscribers : null} reachable={!!sends} />
        <div className="panel">
          <h2 className="panel__title">Private notes {replies ? <span className="muted">· {replies.length}</span> : null}</h2>
          {!replies ? <p className="muted">Backend not reachable.</p> : replies.length === 0 ? <p className="muted">No private notes yet. &quot;Send privately instead&quot; lands here and in your inbox.</p> : (
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
        </div>
        <div className="panel">
          <h2 className="panel__title">Site health</h2>
          <ul className="list">
            <li><span>Last email sent</span><span className="muted">{stats?.lastEmail ? `${readableDate(stats.lastEmail.sent.slice(0, 10))} · ${stats.lastEmail.recipients} recipients` : "never"}</span></li>
            <li><span>Latest post</span><span className="muted">{latest ? readableDate(latest.date) : "none"}</span></li>
            <li><span>Deploys</span><a className="muted" href="https://vercel.com">Vercel</a></li>
          </ul>
        </div>
        <TrafficPanel />
        <StoredDataPanel tables={stored.tables} now={stored.at} />
      </div>
    </section>
  );
}
