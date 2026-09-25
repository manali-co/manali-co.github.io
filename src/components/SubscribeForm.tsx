"use client";
import { useState } from "react";

type State = "idle" | "submitting" | "ok" | "already" | "invalid" | "error";

const copy: Record<State, string> = {
  idle: "",
  submitting: "Sending…",
  ok: "Check your inbox. There's one link to click, then you're in.",
  already: "You're already on the list. Nothing to do.",
  invalid: "That doesn't look like an email address.",
  error: "Something on our side broke. Try again in a minute, or open an issue if it keeps happening.",
};

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setState("invalid");
    setState("submitting");
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      if (res.status === 409) return setState("already");
      if (!res.ok) return setState("error");
      setState("ok");
    } catch {
      setState("error");
    }
  };
  return (
    <section className="subscribe" aria-labelledby="subscribe-title">
      <h2 id="subscribe-title" className="subscribe__title">{compact ? "New posts by email" : "Subscribe"}</h2>
      <p className="subscribe__lede">New posts by email. No spam, no schedule, unsubscribe in one click.</p>
      <form className="subscribe__form" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="sub-email">Email</label>
        <input id="sub-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); if (state !== "idle") setState("idle"); }} disabled={state === "submitting" || state === "ok"} />
        <button className="button button--primary" type="submit" disabled={state === "submitting" || state === "ok"}>{state === "submitting" ? "Sending…" : "Subscribe"}</button>
      </form>
      <p className={`subscribe__status ${state === "ok" || state === "already" ? "subscribe__status--ok" : state === "invalid" || state === "error" ? "subscribe__status--err" : ""}`} role="status" aria-live="polite">{copy[state]}</p>
    </section>
  );
}
