"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import type { AnnouncePost, EmailPreview, Recipient } from "@/lib/backend";
import { announce, previewEmail } from "./actions";

/* Ported from the design system (components/admin/AnnouncementsPanel.jsx). Every post, newest first
   by publish time, each with its send status. Not sent: "Preview and send" (an optional note that
   opens the letter, the exact email, then "Yes, send it"). Sent: "Sent 29 Sep, 14:02 · 12 of 12",
   "Who got it" (failed first), "Preview email", and "Send again" behind "Yes, everyone gets it twice". */
export type Send = { at: string; total: number; failed: number; kept: boolean; recipients: Recipient[] };
export type AnnounceRow = { post: AnnouncePost; send: Send | null };

const DOT: Record<string, string> = { yapp: "#E8B79A", "what-should-we-watch": "var(--wswatch-coral)", spark: "#E03C7A", portfolio: "#D2491F", manali: "var(--accent)" };
const ERR = "var(--wswatch-coral)";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Status({ send, known }: { send: Send | null; known: boolean }) {
  if (!known) return <span className="ann__status ann__status--faint">Send status unknown</span>;
  if (!send) return <span className="ann__status"><span aria-hidden="true" className="ann__sun" />Not sent</span>;
  if (!send.kept) return <span className="ann__status ann__status--faint">Sent {send.at} to {send.total} · recipient list not kept</span>;
  const bad = send.failed > 0;
  return (
    <span className="ann__status" style={bad ? { color: ERR } : undefined}>
      <span aria-hidden="true" style={{ display: "inline-flex", flex: "none", color: bad ? ERR : "var(--status-live)" }}><Icon name={bad ? "alert" : "check"} size={14} /></span>
      <span>Sent {send.at} · {send.total - send.failed} of {send.total}{bad ? `, ${send.failed} failed` : ""}</span>
    </span>
  );
}

function Recipients({ list }: { list: Recipient[] }) {
  const sorted = [...list].sort((a, b) => Number(a.ok) - Number(b.ok));
  return (
    <div className="ann__who">
      <span className="ann__label">Who got it</span>
      <ol>
        {sorted.map((r, i) => (
          <li key={r.email || `gone-${i}`}>
            <span aria-hidden="true" className="ann__dot" style={{ background: r.ok ? "var(--status-live)" : ERR }} />
            <span className="ann__addr">
              {r.email || <span className="ann__faint">Someone who has since unsubscribed</span>}
              {r.follower && <span className="ann__faint"> · follower</span>}
            </span>
            <span className="ann__result" style={r.ok ? undefined : { color: ERR }}>{r.ok ? "Delivered" : `Failed${r.reason ? ` · ${r.reason}` : ""}`}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* The exact HTML the API would send, in a sandboxed frame sized to its content. */
function Preview({ post, note, setNote, withNote, onPreview }: { post: AnnouncePost; note: string; setNote: (v: string) => void; withNote: boolean; onPreview: (p: EmailPreview | null) => void }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [preview, setPreview] = useState<EmailPreview | null | "error">(null);
  const [height, setHeight] = useState(640);
  const frame = useRef<HTMLIFrameElement>(null);
  const [debounced, setDebounced] = useState(note);
  useEffect(() => { const t = setTimeout(() => setDebounced(note), 400); return () => clearTimeout(t); }, [note]);
  useEffect(() => {
    let live = true;
    previewEmail({ ...post, note: debounced }, theme).then((p) => { if (!live) return; setPreview(p || "error"); onPreview(p); }).catch(() => live && setPreview("error"));
    return () => { live = false; };
  }, [post, debounced, theme, onPreview]);
  const fit = () => { const doc = frame.current?.contentDocument; if (doc) setHeight(Math.min(doc.documentElement.scrollHeight, 1400)); };
  const seg = (v: "light" | "dark", label: string) => <button type="button" aria-pressed={theme === v} onClick={() => setTheme(v)}>{label}</button>;
  return (
    <div className="ann__preview">
      {withNote && (
        <label className="ann__note">
          <span className="ann__label">A note from you <span className="ann__faint">(optional, opens the email)</span></span>
          <textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A line or two: why this one, what to look for." />
        </label>
      )}
      <div className="ann__bar">
        <span className="ann__label">Exactly what subscribers get</span>
        <span role="group" aria-label="Preview theme" className="ann__seg">{seg("light", "Light")}{seg("dark", "Dark")}</span>
      </div>
      <div className="ann__mail">
        {preview && preview !== "error" && (
          <div className="ann__meta">
            <span>From</span><span>{preview.from}</span>
            <span>Subject</span><span><b>{preview.subject}</b></span>
            <span>Preview</span><span className="ann__muted">{preview.preheader}</span>
          </div>
        )}
        {preview === "error" ? <p className="ann__pad ann__faint">Couldn&apos;t load the preview. The backend didn&apos;t answer; try again.</p>
          : !preview ? <p className="ann__pad ann__faint">Loading the email…</p>
          : <iframe ref={frame} title={`Email preview: ${preview.subject}`} sandbox="allow-same-origin" srcDoc={preview.html} onLoad={fit} style={{ height }} />}
      </div>
    </div>
  );
}

function Confirm({ text, yes, busy, error, onYes, onNo }: { text: string; yes: string; busy: boolean; error: string | null; onYes: () => void; onNo: () => void }) {
  return (
    <div role="alertdialog" aria-label="Confirm send" className="ann__confirm">
      <p>{text}</p>
      <div className="ann__actions">
        <button type="button" className="button button--primary" disabled={busy} onClick={onYes}>{busy ? "Sending…" : yes}</button>
        <button type="button" className="button button--ghost" disabled={busy} onClick={onNo}>Not yet</button>
        {error && <span role="alert" className="ann__err">{error}</span>}
      </div>
    </div>
  );
}

function Row({ row, first, known }: { row: AnnounceRow; first: boolean; known: boolean }) {
  const { post } = row;
  const [open, setOpen] = useState<null | "send" | "confirm" | "who" | "preview" | "resend">(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<Send | null>(null);
  const [audience, setAudience] = useState<EmailPreview | null>(null);
  const [busy, start] = useTransition();
  const send = justSent || row.send;
  const toggle = (k: typeof open) => { setError(null); setOpen(open === k ? null : k); };
  const go = (force: boolean) => start(async () => {
    setError(null);
    const r = await announce({ ...post, note, force });
    if ("error" in r) { setError(r.error === "already" ? "This one already went out. Close this and use Send again." : "Couldn't send. The backend said no; nothing went out."); return; }
    setJustSent({ at: "just now", total: r.subscribers, failed: r.subscribers - r.recipients, kept: true, recipients: [] });
    setOpen(null);
  });
  const n = audience?.audience;
  const who = n === undefined ? "everyone it goes to" : post.seriesTitle && audience?.followers ? `${plural(n - audience.followers, "subscriber")} and ${plural(audience.followers, "follower")} of ${post.seriesTitle}` : plural(n, "subscriber");
  const previewing = open === "preview" || open === "send" || open === "confirm";
  return (
    <li className="ann__row" style={first ? { borderTop: 0 } : undefined}>
      <div className="ann__head">
        <div className="ann__info">
          <span className="ann__title">{post.title}</span>
          <span className="ann__sub">
            <span className="ann__date"><span aria-hidden="true" className="ann__dot" style={{ background: DOT[post.project] || "var(--accent)" }} />{post.date}</span>
            {post.seriesTitle && <span>+ followers of {post.seriesTitle}</span>}
          </span>
          <Status send={send} known={known || !!justSent} />
        </div>
        <div className="ann__buttons">
          {!send && known && <button type="button" className="button button--sm" aria-expanded={open === "send" || open === "confirm"} onClick={() => toggle(open === "confirm" ? "confirm" : "send")}>{open === "send" || open === "confirm" ? "Close preview" : "Preview and send"}</button>}
          {send?.kept && send.recipients.length > 0 && (
            <button type="button" className="button button--sm button--ghost" aria-expanded={open === "who"} onClick={() => toggle("who")}>
              Who got it<span aria-hidden="true" style={{ display: "inline-flex", transform: open === "who" ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast) var(--ease-out)" }}><Icon name="chevron-down" size={14} /></span>
            </button>
          )}
          {send && <button type="button" className="button button--sm button--ghost" aria-expanded={open === "preview"} onClick={() => toggle("preview")}>Preview email</button>}
          {send && <button type="button" className="button button--sm button--ghost" onClick={() => toggle("resend")}>Send again</button>}
        </div>
      </div>
      {open === "who" && send && <Recipients list={send.recipients} />}
      {previewing && <Preview post={post} note={note} setNote={setNote} withNote={!send} onPreview={setAudience} />}
      {open === "send" && (
        <div className="ann__actions">
          <button type="button" className="button button--primary" disabled={n === undefined || n === 0} onClick={() => setOpen("confirm")}><Icon name="send" size={15} />{n === undefined ? "Send" : n === 0 ? "No one to send to yet" : `Send to ${n} ${n === 1 ? "person" : "people"}`}</button>
          <span className="ann__faint">You&apos;ll confirm first.</span>
        </div>
      )}
      {open === "confirm" && <Confirm text={`Send "${post.title}" to ${who}? Anyone on both lists gets it once. There's no unsend.`} yes="Yes, send it" busy={busy} error={error} onYes={() => go(false)} onNo={() => setOpen("send")} />}
      {open === "resend" && send && <Confirm text={`This already went out${send.at === "just now" ? "" : ` on ${send.at}`}. Sending again emails everyone it goes to a second copy. There's no unsend.`} yes="Yes, everyone gets it twice" busy={busy} error={error} onYes={() => go(true)} onNo={() => setOpen(null)} />}
    </li>
  );
}

export function AnnouncementsPanel({ rows, subscribers, reachable }: { rows: AnnounceRow[]; subscribers: number | null; reachable: boolean }) {
  const unsent = rows.filter((r) => !r.send).length;
  return (
    <div className="panel ann">
      <div className="ann__top">
        <h2 className="panel__title">Announcements</h2>
        <span className="ann__faint">{subscribers ?? "—"} subscribers{reachable && unsent ? ` · ${unsent} not sent` : ""}</span>
      </div>
      {!reachable && <p className="muted">Backend not reachable, so send history is unknown. Set API_BASE_URL, API_KEY and ADMIN_API_KEY.</p>}
      {rows.length === 0 ? <p className="muted">No posts yet. Write one first.</p> : (
        <ol className="ann__list">{rows.map((r, i) => <Row key={r.post.slug} row={r} first={i === 0} known={reachable} />)}</ol>
      )}
    </div>
  );
}
