"use client";
import { useState } from "react";
import { Icon } from "./Icon";

type State = "idle" | "submitting" | "success" | "already" | "invalid" | "error";

const DONE: Record<"success" | "already", { title: string; text: string; icon: string }> = {
  success: { title: "Check your inbox.", text: "We sent a confirmation link. Click it and you're in.", icon: "mail" },
  already: { title: "You're already on the list.", text: "Nothing to do. We'll write when there's something worth reading.", icon: "check" },
};

/* Email field + one primary button. Same block everywhere: a card on its own, bare when compact. */
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
      setState("success");
    } catch {
      setState("error");
    }
  };
  const done = state === "success" || state === "already";
  return (
    <section className={`subscribe ${compact ? "subscribe--compact" : ""}`} aria-label="Subscribe">
      {done ? (
        <div className="subscribe__done" role="status">
          <span className={`subscribe__dot subscribe__dot--${state}`} aria-hidden="true"><Icon name={DONE[state as "success" | "already"].icon} size={16} /></span>
          <div>
            <p className="subscribe__title">{DONE[state as "success" | "already"].title}</p>
            <p className="subscribe__lede">{DONE[state as "success" | "already"].text}</p>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="subscribe__title">New posts by email.</p>
            <p className="subscribe__lede">No spam, no schedule, unsubscribe in one click.</p>
          </div>
          <form className="subscribe__form" onSubmit={submit} noValidate>
            <label className="sr-only" htmlFor="sub-email">Email</label>
            <input
              id="sub-email" type="email" name="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email}
              aria-invalid={state === "invalid"} aria-describedby="sub-status"
              className={state === "invalid" ? "is-invalid" : ""}
              onChange={(e) => { setEmail(e.target.value); if (state === "invalid" || state === "error") setState("idle"); }}
              disabled={state === "submitting"}
            />
            <button className="button button--primary" type="submit" disabled={state === "submitting"}>{state === "submitting" ? "Subscribing…" : "Subscribe"}</button>
          </form>
          <p id="sub-status" className={`subscribe__status ${state === "invalid" || state === "error" ? "subscribe__status--err" : ""}`} role="status" aria-live="polite">
            {state === "invalid" ? "That doesn't look like an email." : state === "error" ? "Something on our side broke. Try again in a minute, or open an issue if it keeps happening." : ""}
          </p>
        </>
      )}
    </section>
  );
}
