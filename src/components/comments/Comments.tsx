"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../Icon";
import { SunGlyph } from "../ReactionBar";
import { track } from "../Telemetry";
import { ReaderAvatar } from "./ReaderAvatar";
import { CommentComposer, type ComposerState, type ComposerValue } from "./CommentComposer";
import { readerIdentity, useReader } from "./identity";

/* Ported from the design system (components/comments/Comments.jsx). Public comments with no
   account. The composer (the post's own question as the prompt, "Send privately instead" for a
   note only the owner reads) sits above a one-level thread sorted Best or Newest; the owner's
   comments carry an Author badge; readers can love a comment, reply, and get replies by email.
   A first comment from a new browser waits for approval, shown only to its author. */
type Row = { id: string; parent: string; state: "live" | "pending" | "removed"; created: string; text?: string; name?: string; owner?: boolean; seed?: string; loves?: number; loved?: boolean; mine?: boolean; notify?: boolean; canNotify?: boolean };
type Node = Row & { replies: Row[] };
const OWNER = "Ayush";

const when = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); } catch { return ""; } };
const nameOf = (r: Row) => (r.owner ? OWNER : r.name || readerIdentity(r.seed || "").name);

function Avatar({ r, size }: { r: Row; size: number }) {
  if (r.owner) return <span aria-hidden="true" className="cm-owner" style={{ width: size, height: size, fontSize: size > 28 ? 12 : 10 }}>{OWNER[0]}</span>;
  return <ReaderAvatar seed={r.seed || ""} size={size} faded={r.state === "removed"} />;
}

function Heart({ n = 0, on, onClick }: { n?: number; on?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`cm-heart ${on ? "is-on" : ""}`} onClick={onClick} aria-pressed={!!on} aria-label={`Loved it${n ? `, ${n}` : ""}`}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill={on ? "var(--react-heart)" : "none"} stroke="var(--react-heart)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>{n > 0 && n}
    </button>
  );
}

type Handlers = { replying: string | null; setReplying: (id: string | null) => void; act: (id: string, action: "love" | "notify", extra?: Record<string, unknown>) => void };

function Item({ c, reply, h }: { c: Row; reply?: boolean; h: Handlers }) {
  const size = reply ? 28 : 32;
  const removed = c.state === "removed", pending = c.state === "pending";
  const thread = c.parent || c.id;
  return (
    <div className={`cm ${pending ? "cm--pending" : ""}`} style={{ gridTemplateColumns: `${size}px minmax(0,1fr)` }}>
      <Avatar r={c} size={size} />
      <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
        <div className="cm__head" style={{ minHeight: size }}>
          <span className={`cm__name ${removed ? "is-removed" : ""}`}>{removed ? "Removed" : nameOf(c)}</span>
          {c.owner && !removed && <span className="cm-pill cm-pill--author">Author</span>}
          {c.mine && !removed && <span className="cm-pill cm-pill--you">You</span>}
          <span className="cm__date">{when(c.created)}</span>
        </div>
        {pending && <span className="cm__held"><Icon name="shield" size={14} />Waiting for {OWNER} to approve it. Only you can see this.</span>}
        <p className={`cm__body ${removed ? "is-removed" : ""}`}>{removed ? `Removed by ${OWNER}.` : c.text}</p>
        {!removed && !pending && (
          <div className="cm__actions">
            <Heart n={c.loves} on={c.loved} onClick={() => h.act(c.id, "love")} />
            <button type="button" className="cm__act" onClick={() => h.setReplying(h.replying === thread ? null : thread)}><Icon name="message" size={14} />Reply</button>
            {c.mine && c.canNotify && <button type="button" className={`cm__act ${c.notify ? "is-on" : "is-quiet"}`} aria-pressed={!!c.notify} onClick={() => h.act(c.id, "notify", { notify: !c.notify })}><Icon name="bell" size={14} />{c.notify ? "Replies by email: on" : "Email me replies"}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export function Comments({ slug, title, ask }: { slug: string; title: string; ask?: string }) {
  const me = useReader();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [off, setOff] = useState(false);
  const [sort, setSort] = useState<"best" | "newest">("best");
  const [replying, setReplying] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments/${slug}/`, { headers: me.client ? { "x-client": me.client } : {}, cache: "no-store" });
      if (!res.ok) { if ([404, 405, 503].includes(res.status)) setOff(true); setRows([]); return; }
      setRows(((await res.json()) as { comments: Row[] }).comments);
    } catch { setRows([]); }
  }, [slug, me.client]);
  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- loading data from the API

  const post = async (v: ComposerValue, parent = ""): Promise<ComposerState> => {
    if (!me.client) return "error";
    if (v.mode === "private") {
      const res = await fetch(`/api/replies/${slug}/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: me.client, text: v.text, name: v.name, email: v.email, title }) });
      track("reply", { post: slug, result: res.ok ? "sent" : String(res.status), with_email: !!v.email });
      return res.ok ? "sent" : res.status === 429 ? "limited" : res.status === 400 ? "invalid" : [404, 405, 503].includes(res.status) ? "unavailable" : "error";
    }
    const res = await fetch(`/api/comments/${slug}/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: me.client, text: v.text, name: v.name, email: v.email, notify: v.notify, parent, title }) });
    const body = (await res.json().catch(() => ({}))) as { state?: string; detail?: string };
    track("comment", { post: slug, reply: !!parent, result: res.ok ? body.state || "ok" : String(res.status), with_email: !!v.email });
    if (res.ok) { await load(); return body.state === "pending" ? "pending" : "posted"; }
    if (res.status === 400 && body.detail === "name reserved") return "reserved";
    return res.status === 429 ? "limited" : res.status === 400 ? "invalid" : [404, 405, 503].includes(res.status) ? "unavailable" : "error";
  };
  const act = async (id: string, action: "love" | "notify", extra: Record<string, unknown> = {}) => {
    if (!me.client) return;
    const res = await fetch(`/api/comments/${slug}/${id}/${action}/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: me.client, ...extra }) });
    if (!res.ok) return;
    const r = (await res.json()) as { loves?: number; loved?: boolean; notify?: boolean };
    setRows((all) => (all || []).map((c) => (c.id !== id ? c : action === "love" ? { ...c, loves: r.loves, loved: r.loved } : { ...c, notify: r.notify })));
    if (action === "love") track("comment_love", { post: slug, on: !!r.loved });
  };

  const h: Handlers = { replying, setReplying, act };
  if (off) return null; // no backend on this host (the static mirror): nothing to post to
  const all = rows || [];
  const top: Node[] = all.filter((c) => !c.parent).map((c) => ({ ...c, replies: all.filter((r) => r.parent === c.id) }));
  const n = all.filter((c) => c.state !== "removed").length;
  const score = (c: Node) => (c.loves || 0) + c.replies.length;
  const sorted = [...top].sort((a, b) => (a.state === "pending" ? -1 : b.state === "pending" ? 1 : 0) || (sort === "best" ? score(b) - score(a) || (b.id < a.id ? -1 : 1) : b.id < a.id ? -1 : 1));

  return (
    <section id="comments" aria-label="Comments" className="comments">
      <CommentComposer ask={ask} seed={me.seed} onSubmit={(v) => post(v)} />
      <div>
        <div className="comments__head">
          <h2 className="comments__count">{n === 0 ? "Comments" : `${n} ${n === 1 ? "comment" : "comments"}`}</h2>
          {top.length > 1 && (
            <div role="group" aria-label="Sort comments" className="comments__sort">
              {(["best", "newest"] as const).map((v) => <button key={v} type="button" aria-pressed={sort === v} onClick={() => setSort(v)}>{v === "best" ? "Best" : "Newest"}</button>)}
            </div>
          )}
        </div>
        {rows && top.length === 0 ? (
          <div className="comments__empty">
            <span style={{ color: "var(--text-3)" }}><SunGlyph state="low" size={32} /></span>
            <p>No comments yet. The first one needs no account, just a line.</p>
          </div>
        ) : (
          <ol className="comments__list">
            {sorted.map((c) => (
              <li key={c.id} className="comments__item">
                <Item c={c} h={h} />
                {(c.replies.length > 0 || replying === c.id) && (
                  <ol className="comments__replies">
                    {c.replies.map((r) => <li key={r.id} className="comments__reply"><Item c={r} reply h={h} /></li>)}
                    {replying === c.id && (
                      <li className="comments__reply">
                        <CommentComposer compact seed={me.seed} replyingTo={nameOf(c)} onCancel={() => setReplying(null)}
                          onSubmit={async (v) => { const r = await post(v, c.id); if (r === "posted" || r === "pending") setReplying(null); return r; }} />
                      </li>
                    )}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
