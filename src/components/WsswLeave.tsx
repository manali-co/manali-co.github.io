"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { track } from "./Telemetry";
import "@/styles/wsww-waitlist.css";

/* Leaving the What Should We Watch waitlist, from the link in the "You're in" email. A 1:1 port of
   Claude Design's marketing/web/Leave.dc.html. Nothing happens on load (email scanners open every
   link); the person presses "Take me out". Two deliberate differences from the design: the ask
   says "your address" (the link carries only a one-way hash, never the email), and the broken-link
   help points at the app's support page (manali.page has no inbox for replies yet). */

type State = "ask" | "busy" | "done" | "kept" | "expired" | "error";
const SITE = "/what-should-we-watch/";
const TOKEN = /^wl_[0-9a-f]{64}\.[A-Za-z0-9_-]{8,64}$/;

const INK = "var(--mood-on-fill)";
type Eyes = { eyeH: string; eyeRadius: string; eyeBg: string; eyeBW: string; l: string; r: string };
const DOT: Eyes = { eyeH: "7.5px", eyeRadius: "50%", eyeBg: INK, eyeBW: "0", l: "none", r: "none" };
const EYES: Record<string, Eyes> = {
  curious: { ...DOT, l: "scale(1.2)", r: "scale(1.2)" },
  lid: { eyeH: "3.75px", eyeRadius: "0 0 50% 50% / 0 0 100% 100%", eyeBg: "transparent", eyeBW: "0 0 1.6px", l: "none", r: "none" },
  sad: { eyeH: "4px", eyeRadius: "50% 50% 0 0 / 100% 100% 0 0", eyeBg: "transparent", eyeBW: "1.6px 0 0", l: "rotate(12deg) translateY(1px)", r: "rotate(-12deg) translateY(1px)" },
  arc: { ...DOT, eyeH: "4.5px", eyeRadius: "60% 60% 40% 40%" },
  look: { ...DOT, l: "translate(22%, -22%) scale(.9)", r: "translate(22%, -22%) scale(.9)" },
  dot: DOT,
};
type Mouth = { left: string; top: string; w: string; h: string; bw: string; bg: string; radius: string };
const MOUTH: Record<string, Mouth> = {
  o: { left: "47.3px", top: "60.5px", w: "5.4px", h: "5.4px", bw: "1.6px", bg: "transparent", radius: "50%" },
  frown: { left: "45.8px", top: "61px", w: "8.4px", h: "4.9px", bw: "1.6px 0 0", bg: "transparent", radius: "50% 50% 0 0 / 100% 100% 0 0" },
  line: { left: "46.5px", top: "62px", w: "7px", h: "0", bw: "1.6px 0 0", bg: "transparent", radius: "99px" },
  think: { left: "49px", top: "62px", w: "6px", h: "0", bw: "1.6px 0 0", bg: "transparent", radius: "99px" },
  grin: { left: "44.5px", top: "59.5px", w: "11px", h: "6px", bw: "0", bg: INK, radius: "0 0 50% 50% / 0 0 100% 100%" },
};
const E = "cubic-bezier(.2,1,.3,1)";
const FACE: Record<State, { mood: string; eyes: string; mouth: string; anim?: string; wave?: string; top?: string; eyeAnim?: string; blink?: boolean }> = {
  ask: { mood: "curious", eyes: "curious", mouth: "o", blink: true },
  busy: { mood: "waiting", eyes: "look", mouth: "line", eyeAnim: "lv-think 1.4s ease-in-out infinite" },
  done: { mood: "sad wave", eyes: "sad", mouth: "frown", wave: `lv-wave 1.8s ${E} 200ms 2`, top: `lv-droop 600ms ${E} both` },
  kept: { mood: "grin", eyes: "arc", mouth: "grin", anim: `wl-hop 560ms ${E} 80ms both`, blink: true },
  expired: { mood: "thinking", eyes: "look", mouth: "think" },
  error: { mood: "deadpan", eyes: "dot", mouth: "line", anim: `lv-shake 480ms ${E} both` },
};
const COPY: Record<State, { title: string; body: string; primary?: string; quiet?: string; link?: string; href?: string }> = {
  ask: { title: "Take me out of line?", body: "This takes your address out of the What Should We Watch waitlist. I forget it and nothing more arrives from me. No hard feelings. Mostly.", primary: "Take me out", quiet: "Actually, keep me in" },
  busy: { title: "Take me out of line?", body: "This takes your address out of the What Should We Watch waitlist. I forget it and nothing more arrives from me. No hard feelings. Mostly.", primary: "One sec…", quiet: "Actually, keep me in" },
  done: { title: "You’re out of line.", body: "I won’t email you again. The remote is all yours.", link: "Changed your mind? Get back in.", href: SITE },
  kept: { title: "Good. You’re staying.", body: "Same deal as before: one email the day it lands, maybe one before. Nothing else.", link: "Tell the people you watch with", href: SITE },
  expired: { title: "That link’s past it.", body: "It expired, or got bent on the way here. Open the newest email from me and use the link there, or write to me and I’ll sort it by hand.", link: "Write to Disco", href: "/wsww/app/support.html" },
  error: { title: "That didn’t go through on my side.", body: "Nothing changed yet. Try again.", primary: "Try again", quiet: "Actually, keep me in" },
};

function Disco({ state }: { state: State }) {
  const f = FACE[state], eyes = EYES[f.eyes], m = MOUTH[f.mouth];
  const eye = (t: string): CSSProperties => ({ width: "7.5px", height: eyes.eyeH, boxSizing: "border-box", borderRadius: eyes.eyeRadius, background: eyes.eyeBg, borderWidth: eyes.eyeBW, borderStyle: "solid", borderColor: INK, transform: t, animation: f.eyeAnim || "none", transition: `all 320ms ${E}` });
  const blend = "var(--mood-blend-mode)" as CSSProperties["mixBlendMode"];
  return (
    <div className="lv-disco" role="img" aria-label={`Disco, ${f.mood}`}>
      <div className="lv-disco-in">
        <div style={{ position: "absolute", inset: 0, animation: f.anim || "none" }}>
          <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
            <div style={{ position: "absolute", left: 21, top: 11, width: 58, height: 58, borderRadius: "50%", background: "var(--mood-coral)", mixBlendMode: blend, animation: f.top || "none" }} />
            <div style={{ position: "absolute", left: 7, top: 33, width: 58, height: 58, borderRadius: "46% 54% 48% 52% / 54% 46% 54% 46%", background: "var(--mood-lilac)", mixBlendMode: blend }} />
            <div style={{ position: "absolute", left: 35, top: 33, width: 58, height: 58, borderRadius: "50%", background: "var(--mood-lagoon)", mixBlendMode: blend, transformOrigin: "30% 80%", animation: f.wave || "none" }} />
          </div>
          <div style={{ position: "absolute", left: 39.75, top: 49.25, width: 20.5, height: 7.5, display: "flex", justifyContent: "space-between", alignItems: "center", animation: f.blink ? "wl-blink 5s linear infinite" : "none" }}>
            <span style={eye(eyes.l)} /><span style={eye(eyes.r)} />
          </div>
          <span style={{ position: "absolute", left: m.left, top: m.top, width: m.w, height: m.h, boxSizing: "border-box", borderWidth: m.bw, borderStyle: "solid", borderColor: INK, background: m.bg, borderRadius: m.radius, transition: `all 320ms ${E}` }} />
        </div>
      </div>
    </div>
  );
}

export function WsswLeave() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<State>(() => (TOKEN.test(token) ? "ask" : "expired"));
  const c = COPY[state], busy = state === "busy";

  const leave = async () => {
    if (busy) return;
    setState("busy");
    try {
      const res = await fetch("/api/waitlist/leave/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const next: State = res.ok ? "done" : res.status === 400 ? "expired" : "error";
      track("waitlist_leave", { result: next });
      setState(next);
    } catch {
      track("waitlist_leave", { result: "network_error" });
      setState("error");
    }
  };

  return (
    <div className="wl lv">
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600&display=swap" />
      <header className="wl-head">
        <a className="wl-name" href={SITE}>What Should We Watch</a>
        <div className="wl-soon lv-tag">Coming soon · iOS</div>
      </header>
      <main className="lv-main">
        <section className="lv-stack" data-state={state} key={state}>
          <Disco state={state} />
          <div className="lv-copy">
            <h1>{c.title}</h1>
            <p className="lv-body" role="status" aria-live="polite">{c.body}</p>
          </div>
          <div className="lv-actions">
            {c.primary && <button type="button" className="lv-primary" onClick={leave} disabled={busy} aria-busy={busy}>{c.primary}</button>}
            {c.quiet && <button type="button" className="lv-quiet" onClick={() => setState("kept")} disabled={busy}>{c.quiet}</button>}
            {c.link && <a className="lv-quiet" href={c.href || SITE}>{c.link}</a>}
          </div>
        </section>
      </main>
      <footer className="wl-foot">
        <svg className="wl-waves lv-waves" viewBox="0 0 1080 240" preserveAspectRatio="none" aria-hidden="true">
          <path d="M -60 70 C 300 70, 460 -20, 700 24 C 880 56, 960 70, 1140 70" style={{ stroke: "var(--mood-coral)" }} />
          <path d="M -60 132 C 300 132, 460 42, 700 86 C 880 118, 960 132, 1140 132" style={{ stroke: "var(--mood-lilac)" }} />
          <path d="M -60 194 C 300 194, 460 104, 700 148 C 880 180, 960 194, 1140 194" style={{ stroke: "var(--mood-lagoon)" }} />
        </svg>
        <div className="wl-links"><Link href="/">manali apps</Link><Link href="/privacy/">Privacy</Link></div>
      </footer>
    </div>
  );
}
