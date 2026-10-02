"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "./Telemetry";
import "@/styles/wsww-waitlist.css";

/* The What Should We Watch page while the app is in App Store review: one viewport, the app's own
   chrome, an email + consent waitlist. Ported 1:1 from Claude Design's templates/wsww-waitlist.html.
   Joining follows the "what-should-we-watch" launch list (double opt-in, one email at launch). */

type State = "idle" | "invalid" | "consent" | "submitting" | "success" | "unavailable" | "error";
type Store = { store: "app-store" | "google-play"; state: "soon" | "live"; href: string };

const MOODS = [["Cosy", "coral"], ["Tense", "lilac"], ["Weird", "lagoon"], ["Big", "pink"], ["Quiet", "sky"], ["Funny", "peach"]] as const;
const HEADLINE: [string, string?][] = [["The"], ["question"], ["everyone"], ["asks"], ["at"], ["9pm,", "coral"], ["answered"], ["before"], ["9:20.", "lagoon"]];
const MESSAGES: Partial<Record<State, string>> = {
  invalid: "That doesn't look like an email.",
  consent: "Tick the box so we're allowed to email you.",
  unavailable: "Our side is down right now. Nothing was saved. Try again in a minute.",
  error: "That didn't go through. Nothing was saved. Try again.",
};
const STORE_LABEL = { "app-store": ["Coming to the", "Download on the", "App Store"], "google-play": ["Coming to", "Get it on", "Google Play"] } as const;

function Deck({ className }: { className: string }) {
  return (
    <div className={`wl-deck ${className}`} aria-hidden="true">
      {MOODS.map(([word, hue], i) => (
        <div key={word} className={`wl-card wl-c${i + 1} wl-m-${hue}`}>
          <i className="wl-mk" aria-hidden="true"><u /><u /><u /></i>
          <b>{word}</b>
          <small>10 films · tonight</small>
        </div>
      ))}
    </div>
  );
}

const Check = () => <svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg>;

export function WsswWaitlist({ icon, stores }: { icon: string; stores: Store[] }) {
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // iOS keyboard: size the page to the visual viewport and drop decoration while it's open, so the field stays in view.
  useEffect(() => {
    const vv = window.visualViewport, root = document.documentElement;
    if (!vv) return;
    const fit = () => {
      root.style.setProperty("--vvh", `${vv.height}px`);
      root.dataset.kb = window.innerHeight - vv.height > 120 ? "1" : "0";
      window.scrollTo(0, 0);
    };
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    fit();
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      root.style.removeProperty("--vvh");
      delete root.dataset.kb;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setState("invalid"); emailRef.current?.focus(); return; }
    if (!consent) return setState("consent");
    setState("submitting");
    try {
      const res = await fetch("/api/subscribe/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, series: "what-should-we-watch" }) });
      // The API answers 202 whether or not the address is already on the list, so "already" looks like success.
      const next: State = res.ok ? "success" : res.status === 400 ? "invalid" : [404, 405, 502, 503].includes(res.status) ? "unavailable" : "error";
      track("waitlist", { result: next, app: "what-should-we-watch" });
      setState(next);
      if (next === "success") emailRef.current?.blur();
    } catch {
      track("waitlist", { result: "network_error", app: "what-should-we-watch" });
      setState("unavailable");
    }
  };

  const busy = state === "submitting";
  return (
    <div className="wl-frame">
      {/* The app's faces, not the blog's. React hoists this into <head>. */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600&family=Figtree:wght@400;500;600&display=swap" />
      <div className="wl-page" data-state={state}>
        <div className="wl-discs" aria-hidden="true">
          <span className="wl-disc wl-d1"><i /></span><span className="wl-disc wl-d2"><i /></span><span className="wl-disc wl-d3"><i /></span>
        </div>

        <header className="wl-top">
          <Link className="wl-back" href="/" aria-label="Back to manali apps">
            <svg viewBox="0 0 24 24"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg><b>manali apps</b>
          </Link>
          <span className="wl-wm">What Should We Watch</span>
        </header>

        <div className="wl-main">
          <section className="wl-hero">
            <div className="wl-hero-top">
              <div className="wl-icon"><img src={icon} alt="What Should We Watch app icon" width={56} height={56} /></div>
              <Deck className="wl-deck-m" />
            </div>
            <h1>
              {HEADLINE.map(([w, hue], i) => (
                <Fragment key={i}>
                  <span className={hue ? `wl-${hue}` : undefined} style={{ "--i": i } as React.CSSProperties}>{w}</span>{" "}
                </Fragment>
              ))}
            </h1>
            <p className="wl-lede">Pick a mood, ten films actually streaming tonight, swipe to decide.</p>
            <p className="wl-status"><i aria-hidden="true" />In App Store review — launching in a few days</p>

            <form className="wl-form" onSubmit={submit} noValidate>
              <div className="wl-row">
                <input
                  ref={emailRef} className="wl-field" id="wl-email" type="email" name="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false}
                  placeholder="you@example.com" aria-label="Email" aria-describedby="wl-msg" aria-invalid={state === "invalid"} disabled={busy} value={email}
                  onChange={(e) => { setEmail(e.target.value); if (state === "invalid" || state === "unavailable" || state === "error") setState("idle"); }}
                />
                <button className="wl-btn" type="submit" disabled={busy}>
                  <span className="wl-spin" aria-hidden="true" /><span>{busy ? "Joining…" : "Join the waitlist"}</span>
                </button>
              </div>
              <label className="wl-consent" htmlFor="wl-consent">
                <input type="checkbox" id="wl-consent" name="consent" checked={consent} disabled={busy}
                  onChange={(e) => { setConsent(e.target.checked); if (state === "consent" && e.target.checked) setState("idle"); }} />
                <span className="wl-box"><Check /></span>
                <span>Email me when it&apos;s on the App Store</span>
              </label>
              <p className="wl-msg" id="wl-msg" role="status" aria-live="polite">{MESSAGES[state] ?? ""}</p>
              <p className="wl-fine">One email at launch, nothing else. Unsubscribe in one click.</p>
            </form>

            <div className="wl-done" role="status" aria-live="polite">
              {state === "success" && (
                <>
                  <h2><span className="wl-check" aria-hidden="true"><Check /></span>You&apos;re on the list.</h2>
                  <p>Check your inbox to confirm. One click and you&apos;re in.</p>
                  <p className="wl-fine">One email at launch, nothing else. Unsubscribe in one click.</p>
                </>
              )}
            </div>
          </section>

          <aside className="wl-aside" aria-hidden="true"><Deck className="wl-deck-d" /></aside>
        </div>

        <footer className="wl-foot">
          <div className="wl-stores">
            {stores.map((s) => {
              const [soon, live, name] = STORE_LABEL[s.store];
              return s.state === "live" && s.href
                ? <a key={s.store} className="wl-store" href={s.href} target="_blank" rel="noopener"><small>{live}</small><b>{name}</b></a>
                : <span key={s.store} className="wl-store" aria-disabled="true"><small>{soon}</small><b>{name}</b></span>;
            })}
          </div>
          <nav className="wl-links" aria-label="Legal">
            <a href="/wsww/app/privacy.html">Privacy</a><span>·</span><a href="/wsww/app/terms.html">Terms</a><span>·</span><a href="/wsww/app/support.html">Support</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
