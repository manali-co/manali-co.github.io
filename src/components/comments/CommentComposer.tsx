"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "../Icon";
import { ReaderAvatar } from "./ReaderAvatar";
import { readerIdentity } from "./identity";

/* Ported from the design system (components/comments/CommentComposer.jsx). One composer for public
   comments and private notes. No account: the reader posts as their browser's friendly identity
   ("Quiet Ridge"), may pick a display name, and may leave an email only for reply notifications
   (never shown). "Send privately instead" turns it into the old reply box: it goes to Ayush, not
   onto the page. */
export type ComposerState = "idle" | "posting" | "posted" | "pending" | "sent" | "invalid" | "reserved" | "limited" | "unavailable" | "error";
export type ComposerValue = { text: string; name: string; email: string; notify: boolean; mode: "public" | "private" };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const STATUS: Partial<Record<ComposerState, string>> = {
  invalid: "That email doesn't look right.",
  reserved: "That name is kept for the author. Pick another, or leave it blank.",
  limited: "That's a lot of comments from this browser. Try again in a bit.",
  unavailable: "Comments aren't switched on here. Try manali.page.",
  error: "Something broke on our side. Try again in a minute.",
};
const OWNER = "Ayush";

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="cc-toggle">
      <span aria-hidden="true" className={`cc-toggle__track ${on ? "is-on" : ""}`}><span className="cc-toggle__knob" /></span>
      {children}
    </button>
  );
}

export function CommentComposer({ ask, seed, onSubmit, compact = false, replyingTo, onCancel }: {
  ask?: string; seed: string; onSubmit: (v: ComposerValue) => Promise<ComposerState>; compact?: boolean; replyingTo?: string; onCancel?: () => void;
}) {
  const me = readerIdentity(seed);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [naming, setNaming] = useState(false);
  const [notify, setNotify] = useState(false);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"public" | "private">("public");
  const [state, setState] = useState<ComposerState>("idle");
  const uid = useId();
  const priv = mode === "private";
  const shown = name.trim() || me.name;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || state === "posting") return;
    if ((notify || priv) && email && !EMAIL.test(email)) return setState("invalid");
    setState("posting");
    const r = await onSubmit({ text, name: name.trim(), email: notify || priv ? email : "", notify: !priv && notify && !!email, mode }).catch(() => "error" as const);
    setState(r);
    if (r === "posted" || r === "pending" || r === "sent") setText("");
  };
  if (!compact && (state === "pending" || state === "sent")) {
    const sent = state === "sent";
    return (
      <section aria-live="polite" className="cc cc--done">
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span aria-hidden="true" className={`cc__done-dot ${sent ? "cc__done-dot--sent" : ""}`}><Icon name={sent ? "mail" : "shield"} size={18} /></span>
          <div style={{ display: "grid", gap: 6 }}>
            <p className="cc__done-title">{sent ? "Got it. Thank you." : `Thanks, ${shown}.`}</p>
            <p className="cc__lede">{sent
              ? (email ? `It went straight to ${OWNER}, who answers by email.` : `It went straight to ${OWNER}. Leave an email next time if you'd like an answer.`)
              : `First comments from a new browser wait for ${OWNER} to approve them. Yours is in the thread for you in the meantime; after this one, you post straight away.`}</p>
          </div>
        </div>
        <div><button type="button" className="button button--sm" onClick={() => setState("idle")}>Say something else</button></div>
      </section>
    );
  }
  const err = STATUS[state];
  return (
    <section aria-labelledby={`${uid}-t`} className={compact ? "cc cc--compact" : "cc"}>
      {!compact && (
        <div style={{ display: "grid", gap: 6 }}>
          <p className="cc__kicker">{priv ? `Only to ${OWNER}` : "Comments"}</p>
          <h2 id={`${uid}-t`} className="cc__title">{ask || "What did this make you think?"}</h2>
          <p className="cc__lede">{priv
            ? <>A line is plenty. It goes to {OWNER}, not onto the page, and no account is needed. <Link href="/privacy/">Privacy</Link>.</>
            : <>No account needed. It shows here under your name below. <Link href="/privacy/">Privacy</Link>.</>}</p>
        </div>
      )}
      {compact && <span id={`${uid}-t`} className="sr-only">Reply to {replyingTo}</span>}
      <form onSubmit={submit} style={{ display: "grid", gap: "var(--space-3)" }}>
        <label className="sr-only" htmlFor={`${uid}-x`}>{priv ? `Your note to ${OWNER}` : "Your comment"}</label>
        <textarea id={`${uid}-x`} className="cc__field cc__field--area" rows={compact ? 2 : 3} maxLength={2000} value={text}
          onChange={(e) => { setText(e.target.value); if (state !== "posting") setState("idle"); }}
          placeholder={compact ? `Reply to ${replyingTo}…` : priv ? "Type your note…" : "Say something…"} style={{ minHeight: compact ? 64 : 96 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minHeight: 44 }}>
          <ReaderAvatar seed={seed} size={compact ? 24 : 28} />
          {naming
            ? <span style={{ flex: "1 1 200px", maxWidth: 280 }}><label className="sr-only" htmlFor={`${uid}-n`}>Display name (optional)</label><input id={`${uid}-n`} className="cc__field" value={name} maxLength={40} onChange={(e) => { setName(e.target.value); if (state === "reserved") setState("idle"); }} placeholder={me.name} autoComplete="nickname" /></span>
            : <span className="cc__as">{priv ? "From" : "Posting as"} <b>{shown}</b></span>}
          <button type="button" className="cc__link" onClick={() => setNaming(!naming)}>{naming ? "Done" : "Use a name"}</button>
        </div>
        {!priv && <Toggle on={notify} onChange={setNotify}><Icon name="bell" size={15} />Email me when someone replies</Toggle>}
        {(notify || priv || state === "invalid") && (
          <div style={{ display: "grid", gap: 6 }}>
            <label className="sr-only" htmlFor={`${uid}-e`}>{priv ? "Email, only if you want an answer" : "Email for reply notifications"}</label>
            <input id={`${uid}-e`} className="cc__field" type="email" inputMode="email" value={email} maxLength={254} onChange={(e) => { setEmail(e.target.value); if (state === "invalid") setState("idle"); }}
              placeholder={priv ? "Email, if you want an answer" : "you@example.com"} autoComplete="email" aria-invalid={state === "invalid" || undefined} />
            <span className="cc__hint">{priv ? `Only ${OWNER} sees it.` : "Only for reply notifications. Never shown, one click to stop."}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <button type="submit" className={`button button--primary ${compact ? "button--sm" : ""}`} disabled={state === "posting" || !text.trim()}>
            {state === "posting" ? (priv ? "Sending…" : "Posting…") : compact ? "Reply" : priv ? `Send to ${OWNER}` : "Post"}
          </button>
          {compact && onCancel && <button type="button" className="button button--sm button--ghost" onClick={onCancel}>Cancel</button>}
          {!compact && <button type="button" className="cc__link cc__link--quiet" onClick={() => setMode(priv ? "public" : "private")}><Icon name={priv ? "message" : "mail"} size={15} />{priv ? "Post publicly instead" : "Send privately instead"}</button>}
          <span role="status" className={err ? "cc__status cc__status--err" : "cc__status"}>{err || (state === "posted" ? "Posted." : "")}</span>
        </div>
      </form>
    </section>
  );
}
