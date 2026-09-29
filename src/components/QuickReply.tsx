"use client";
import { useEffect, useId, useRef, useState } from "react";
import { track } from "./Telemetry";

type State = "idle" | "sending" | "sent" | "limited" | "invalid" | "error" | "unavailable";

/* A reply without an account: a few lines, an optional name and email. It goes to Ayush, not
   to the page; nothing here is published. Comments on GitHub stay below for anyone who wants a
   public thread. */
export function QuickReply({ slug, title, ask }: { slug: string; title: string; ask?: string }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const client = useRef("");
  const id = useId();
  useEffect(() => { try { client.current = localStorage.getItem("ma-client") || ""; } catch {} }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setState("invalid");
    if (!client.current) {
      client.current = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
      try { localStorage.setItem("ma-client", client.current); } catch {}
    }
    setState("sending");
    try {
      const res = await fetch(`/api/replies/${slug}/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: client.current, text, name, email, title }) });
      const result: State = res.ok ? "sent" : res.status === 429 ? "limited" : res.status === 400 ? "invalid" : [404, 405, 503].includes(res.status) ? "unavailable" : "error";
      track("reply", { post: slug, result, with_email: !!email, words: text.trim().split(/\s+/).length });
      setState(result);
      if (result === "sent") { setText(""); }
    } catch {
      track("reply", { post: slug, result: "network_error" });
      setState("error");
    }
  };
  if (state === "sent") {
    return (
      <section className="reply reply--sent" aria-live="polite">
        <p className="reply__title">Got it. Thank you.</p>
        <p className="reply__lede">{email ? "It went straight to Ayush, and he answers by email." : "It went straight to Ayush. Leave an email next time if you'd like an answer."}</p>
        <button type="button" className="button button--sm" onClick={() => setState("idle")}>Say something else</button>
      </section>
    );
  }
  return (
    <section className="reply" aria-labelledby={`${id}-t`}>
      <p className="reply__kicker">Reply</p>
      <h2 id={`${id}-t`} className="reply__title">{ask || "What did this make you think?"}</h2>
      <p className="reply__lede">A line is plenty. It goes to Ayush, not onto the page, and no account is needed.</p>
      <form className="reply__form" onSubmit={submit}>
        <label className="sr-only" htmlFor={`${id}-text`}>Your reply</label>
        <textarea id={`${id}-text`} rows={3} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); if (state !== "sending") setState("idle"); }} placeholder="Type your reply…" required />
        <div className="reply__row">
          <label className="sr-only" htmlFor={`${id}-name`}>Name (optional)</label>
          <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Name (optional)" autoComplete="name" />
          <label className="sr-only" htmlFor={`${id}-email`}>Email, only if you want an answer</label>
          <input id={`${id}-email`} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} placeholder="Email, if you want an answer" autoComplete="email" />
        </div>
        <div className="reply__foot">
          <button className="button button--primary" type="submit" disabled={state === "sending" || !text.trim()}>{state === "sending" ? "Sending…" : "Send reply"}</button>
          <span className={`reply__status ${["error", "invalid", "limited", "unavailable"].includes(state) ? "reply__status--err" : ""}`} role="status">
            {state === "invalid" ? "That email doesn't look right." : state === "limited" ? "That's a lot of replies. Try again in a bit." : state === "unavailable" ? "Replies aren't switched on here. Try manali.page." : state === "error" ? "Something broke on our side. Try again in a minute." : ""}
          </span>
        </div>
      </form>
    </section>
  );
}
