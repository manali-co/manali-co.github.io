"use client";
import { useId, useState } from "react";
import { Icon } from "../Icon";
import { track } from "../Telemetry";

/* Ported from the design system (components/series/SeriesFollow.jsx). Follow one series by email:
   one email per new part, nothing else. The answer never says whether an address was already
   on a list, so the done state is always "check your inbox"; the backend sends a confirmation
   link to a new address and a short note to one that is already confirmed. */
type State = "idle" | "submitting" | "success" | "invalid" | "error" | "unavailable";

export function SeriesFollow({ series, seriesName, compact = false, id }: { series: string; seriesName: string; compact?: boolean; id?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const uid = useId();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setState("invalid");
    setState("submitting");
    try {
      const res = await fetch("/api/subscribe/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, series }) });
      if (res.status === 503 || res.status === 404 || res.status === 405) { track("series_follow", { series, result: "unavailable" }); return setState("unavailable"); }
      if (!res.ok) { track("series_follow", { series, result: "error" }); return setState("error"); }
      track("series_follow", { series, result: "ok" });
      setState("success");
    } catch {
      track("series_follow", { series, result: "network_error" });
      setState("error");
    }
  };
  const cls = `series-follow ${compact ? "series-follow--compact" : ""}`;
  if (state === "success") return (
    <section id={id} aria-label="Follow this series" role="status" className={cls}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span aria-hidden="true" className="series-follow__dot"><Icon name="mail" size={16} /></span>
        <div style={{ display: "grid", gap: 4 }}>
          <p className="series-follow__title">Check your inbox.</p>
          <p className="series-follow__lede">Confirm once and the next part of {seriesName} comes to you.</p>
        </div>
      </div>
    </section>
  );
  return (
    <section id={id} aria-label="Follow this series" className={cls}>
      <div style={{ display: "grid", gap: 4 }}>
        <p className="series-follow__title" style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--sun)", display: "inline-flex" }}><Icon name="bell" size={18} /></span>Follow this series</p>
        <p className="series-follow__lede">One email when the next part is up. Nothing else, and one click to stop.</p>
      </div>
      <form className="subscribe__form" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor={`${uid}-email`}>Email</label>
        <input id={`${uid}-email`} type="email" name="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email}
          aria-invalid={state === "invalid"} aria-describedby={`${uid}-status`} className={state === "invalid" ? "is-invalid" : ""}
          onChange={(e) => { setEmail(e.target.value); if (state !== "submitting") setState("idle"); }} disabled={state === "submitting"} />
        <button className="button button--primary" type="submit" disabled={state === "submitting"}>{state === "submitting" ? "Following…" : "Follow"}</button>
      </form>
      <p id={`${uid}-status`} className={`subscribe__status ${state === "invalid" || state === "error" ? "subscribe__status--err" : ""}`} role="status" aria-live="polite">
        {state === "invalid" ? "That doesn't look like an email." : state === "unavailable" ? "Email isn't switched on here. The site at manali.page has it." : state === "error" ? "Something on our side broke. Try again in a minute." : ""}
      </p>
    </section>
  );
}
