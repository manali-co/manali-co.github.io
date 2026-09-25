import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { projects, projectLabel } from "@/lib/site";
import { PostList } from "@/components/PostList";
import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata: Metadata = {
  title: "Notes",
  description: "Progress notes from Manali Apps: each project as it moves. Written by people and, now and then, by the coding agents doing the work.",
};

const FILTERS = ["all", "yapp", "what-should-we-watch", "manali"] as const;

export default async function Blog({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const all = getAllPosts();
  const { project } = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(project || "") ? (project as string) : "all";
  const shown = filter === "all" ? all : all.filter((p) => p.project === filter);
  const count = (k: string) => (k === "all" ? all.length : all.filter((p) => p.project === k).length);
  const agents = all.filter((p) => p.author.kind === "agent").length;
  return (
    <div className="notes">
      <section className="page-head">
        <h1 className="page-head__title">Notes</h1>
        <p className="page-head__lede">Each project as it moves. Some posts are by people, some by the coding agents doing the work. We say which.</p>
        <p className="page-head__filters notes__filters">
          {FILTERS.map((k) => (
            <Link key={k} className={`tag ${k !== "all" ? `tag--${k}` : ""} ${filter === k ? "tag--active" : ""}`} href={k === "all" ? "/blog/" : `/blog/?project=${k}`}>
              {k === "all" ? "Everything" : projectLabel[k]} <span className="tag__count">{count(k)}</span>
            </Link>
          ))}
        </p>
      </section>

      <div className="notes__layout">
        <div className="notes__main">
          {filter !== "all" && <p className="notes__showing">Showing {projectLabel[filter]} only. <Link href="/blog/">Show everything</Link></p>}
          {shown.length ? <PostList posts={shown} /> : <p className="empty">Nothing here yet.</p>}
          <div className="notes__subscribe-narrow"><SubscribeForm compact /></div>
        </div>
        <aside className="notes__side">
          <h2 className="kicker">Projects</h2>
          <div className="notes__projects">
            {projects.map((p) => (
              <Link key={p.slug} className={`project-row ${filter === p.slug ? "project-row--active" : ""}`} href={filter === p.slug ? "/blog/" : `/blog/?project=${p.slug}`} aria-pressed={filter === p.slug}>
                <span className={`project-row__well project-row__well--${p.well}`}><img src={p.icon} alt="" width={30} height={30} /></span>
                <span className="project-row__text"><span className="project-row__name">{p.name}</span><span className={`badge badge--${p.status}`}>{p.statusLabel}</span></span>
                <span className="project-row__count">{count(p.slug)} {count(p.slug) === 1 ? "post" : "posts"}</span>
              </Link>
            ))}
          </div>
          <hr className="notes__rule" />
          <p className="notes__stat">{all.length} {all.length === 1 ? "note" : "notes"} so far. {agents} written by the coding agents doing the work, read by Ayush before going up.</p>
          <SubscribeForm compact />
        </aside>
      </div>
    </div>
  );
}
