"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { site } from "@/lib/site";
import { track } from "./Telemetry";
import { DiscoMark as Avatar, FACES, HUES, SHAPES, type Mark } from "./DiscoMark";
import "@/styles/wsww-waitlist.css";

/* The What Should We Watch page while the app is in App Store review. A 1:1 port of Claude
   Design's marketing/web/Waitlist.dc.html (the app's design project): Disco asks for an email,
   you pick your mark, and on joining it flies to the front of the queue. Joins go through this
   site's /api/waitlist/ to the app's own backend, which hands back your place in line. */

const QUEUE: (Mark & { say?: string; react?: string; size: number })[] = [
  { hue: "coral", shape: "pebble", face: "deadpan", say: "I don’t mind.", react: "Oh. Hello.", size: 64 },
  { hue: "lagoon", shape: "drop", face: "smile", say: "Anything.", react: "One more of us.", size: 56 },
  { hue: "lilac", shape: "bean", face: "thinking", size: 48 },
  { hue: "butter", shape: "tall", face: "sleepy", say: "zzz", size: 60 },
  { hue: "sky", shape: "round", face: "calm", say: "Something with a plot.", size: 52 },
  { hue: "moss", shape: "squish", face: "starry", say: "Dinosaurs.", size: 58 },
  { hue: "coral", shape: "bean", face: "cheeky", size: 44 },
  { hue: "lilac", shape: "squish", face: "grin", size: 50 },
];
const TRAVEL = 640, EASE = "cubic-bezier(.2,1,.3,1)";
const SHARE_URL = `${site.url}/what-should-we-watch/`;
const ERR_EMAIL = "That email doesn’t look right. Have another go.";
// We can't know whether a failed request was saved, and joining twice is harmless, so say that.
const ERR_DOWN = "I couldn’t confirm that. Try again in a minute; joining twice is fine.";
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const randomMe = (prev?: Mark): Mark => {
  let m: Mark;
  do m = { hue: pick(HUES), shape: pick(Object.keys(SHAPES)) as Mark["shape"], face: pick(Object.keys(FACES)) as Mark["face"] };
  while (prev && m.hue === prev.hue && m.shape === prev.shape);
  return m;
};
const fmt = (n: number) => n.toLocaleString("en-GB");
// Real numbers only once the line is long enough to be worth saying out loud; until then, "several".
const SHOW_NUMBERS_FROM = 50;


const disc = (left: number, top: number, hue: string, extra: CSSProperties = {}): CSSProperties => ({ position: "absolute", left, top, width: 58, height: 58, borderRadius: "50%", background: `var(--mood-${hue})`, mixBlendMode: "var(--mood-blend-mode)" as CSSProperties["mixBlendMode"], ...extra });
const eyeDot = (r: string): CSSProperties => ({ width: 7.5, height: 7.5, borderRadius: r, background: "var(--mood-on-fill)" });

/* Disco, the app's mascot: idle (blinking) before you join, celebrating after. */
function Disco({ happy }: { happy: boolean }) {
  const tall = "50% 50% 46% 46% / 60% 60% 40% 40%";
  return (
    <div className="wl-disco" aria-label={happy ? "Disco, celebrate" : "Disco, idle"} role="img">
      <div style={{ position: "absolute", left: 0, top: 0, width: 100, height: 100, transform: "scale(.72)", transformOrigin: "0 0" }}>
        <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
          {happy ? (
            <>
              <div style={disc(21, 11, "coral", { borderRadius: tall, transform: "translate(0, -6%) scale(.9, 1.16)" })} />
              <div style={disc(7, 33, "lilac", { borderRadius: tall, opacity: 0.78, transform: "rotate(-8deg) scale(.92, 1.12)" })} />
              <div style={disc(35, 33, "lagoon", { borderRadius: tall, opacity: 0.78, transform: "rotate(8deg) scale(.92, 1.12)" })} />
            </>
          ) : (
            <>
              <div style={disc(21, 11, "coral")} />
              <div style={disc(7, 33, "lilac", { borderRadius: "46% 54% 48% 52% / 54% 46% 54% 46%" })} />
              <div style={disc(35, 33, "lagoon")} />
            </>
          )}
        </div>
        {happy ? (
          <>
            <div style={{ position: "absolute", left: 39.75, top: 47, width: 20.5, height: 7.5, display: "flex", justifyContent: "space-between", transform: "rotate(-4deg) scaleY(.5)" }}>
              <span style={eyeDot("60% 60% 40% 40%")} /><span style={eyeDot("60% 60% 40% 40%")} />
            </div>
            <span style={{ position: "absolute", left: 42.2, top: 58, width: 15.6, height: 10.9, background: "var(--mood-on-fill)", borderRadius: "0 0 50% 50% / 0 0 100% 100%" }} />
          </>
        ) : (
          <>
            <div style={{ position: "absolute", left: 39.75, top: 49.25, width: 20.5, height: 7.5, display: "flex", justifyContent: "space-between", animation: "wl-blink 5s linear infinite" }}>
              <span style={eyeDot("50%")} /><span style={eyeDot("50%")} />
            </div>
            <span style={{ position: "absolute", left: 45.8, top: 60, width: 8.4, height: 4.9, boxSizing: "border-box", borderBottom: "1.6px solid var(--mood-on-fill)", borderRadius: "0 0 50% 50% / 0 0 100% 100%" }} />
          </>
        )}
      </div>
    </div>
  );
}

type Phase = "form" | "travel" | "joined";
type Device = "ios" | "android" | null;

export function WsswWaitlist() {
  const [me, setMe] = useState<Mark>(() => QUEUE[0]); // a fixed first render, randomised after mount (no hydration mismatch)
  const [pulse, setPulse] = useState(0);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  // Main phone: pre-selected from the user agent after mount (iOS / Android), empty on desktop. Optional.
  const [device, setDevice] = useState<Device>(null);
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMe(randomMe());
      const ua = navigator.userAgent || "";
      const guess: Device = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : null;
      if (guess) setDevice((d) => d ?? guess);
    });
    fetch("/api/waitlist/").then((r) => (r.ok ? r.json() : null)).then((b) => { if (b && typeof b.count === "number") setCount(b.count); }).catch(() => {});
    const t = timers.current;
    return () => { cancelAnimationFrame(raf); t.forEach(clearTimeout); };
  }, []);

  const land = useCallback(() => setPhase("joined"), []);

  // FLIP: once the slot exists, fly a detached copy of your mark from the picker to the front of the queue, then hand over.
  function fly(from: { x: number; y: number; w: number }, clone: HTMLElement, tries = 0): void {
    const target = document.querySelector('[data-wl="slot"] [role="img"]');
    if (!target) { if (tries < 30) later(() => fly(from, clone, tries + 1), 16); else land(); return; }
    const to = target.getBoundingClientRect();
    clone.style.cssText += ";position:fixed;left:0;top:0;z-index:60;pointer-events:none;transform-origin:0 0;margin:0;";
    document.body.appendChild(clone);
    const a = clone.animate(
      [{ transform: `translate(${from.x}px, ${from.y}px) scale(1)` }, { transform: `translate(${to.left}px, ${to.top}px) scale(${to.width / from.w})` }],
      { duration: TRAVEL, easing: EASE, fill: "forwards" },
    );
    const done = () => { land(); clone.remove(); };
    a.onfinish = done;
    later(done, TRAVEL + 80);
  }

  const shuffle = () => { setMe((m) => randomMe(m)); setPulse((p) => p + 1); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setError(ERR_EMAIL);
    setBusy(true);
    let body: { position: number; count: number };
    try {
      const res = await fetch("/api/waitlist/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: v, avatar: { hue: me.hue, shape: me.shape, face: me.face }, platform: device ?? undefined }) });
      if (!res.ok) {
        track("waitlist", { result: `http_${res.status}` });
        return setError(res.status === 400 ? ERR_EMAIL : ERR_DOWN);
      }
      body = (await res.json()) as { position: number; count: number };
    } catch {
      track("waitlist", { result: "network_error" });
      return setError(ERR_DOWN);
    } finally {
      setBusy(false);
    }
    track("waitlist", { result: "ok" });
    setPosition(body.position);
    setCount(body.count);
    setError("");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = document.querySelector<HTMLElement>('[data-wl="picker"] [role="img"]');
    if (reduce || !el) return setPhase("joined");
    const r = el.getBoundingClientRect();
    const clone = el.cloneNode(true) as HTMLElement;
    setPhase("travel");
    later(() => fly({ x: r.left, y: r.top, w: r.width }, clone), 16);
    later(land, TRAVEL + 600); // safety net if the flight never finishes
  };

  // Radio group keys: arrows move (and choose), Space chooses; focus follows the choice.
  const deviceKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) return;
    e.preventDefault();
    // Work from the focused option, not the stored choice, so the first arrow on an unset group moves.
    const focused: Device = e.currentTarget.id === "wl-dev-android" ? "android" : "ios";
    const next: Device = e.key === " " ? focused : focused === "ios" ? "android" : "ios";
    setDevice(next);
    e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#wl-dev-${next}`)?.focus();
  };

  const share = async () => {
    const text = "Disco is nearly ready to pick for us. Get in line.";
    try {
      if (navigator.share) { await navigator.share({ title: "What Should We Watch", text, url: SHARE_URL }); return; }
      await navigator.clipboard.writeText(SHARE_URL);
      setToast("Link copied.");
    } catch {
      setToast(SHARE_URL.replace(/^https?:\/\//, ""));
    }
    later(() => setToast(""), 2400);
  };

  const joined = phase === "joined", travelling = phase === "travel";
  // once you land, the queue turns to look: faces morph to excited and each disc hops in turn, left to right
  const hop = (i: number) => (joined && QUEUE[i].face !== "sleepy" ? `wl-hop 560ms cubic-bezier(.2,1,.3,1) ${80 + i * 70}ms both` : "");

  return (
    <div className="wl" data-screen-label="Waitlist">
      {/* The app's faces, not the blog's (tokens/fonts.css). React hoists this into <head>. */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600&display=swap" />
      <header className="wl-head">
        <div className="wl-name">What Should We Watch</div>
        <div className="wl-soon">Coming soon · iOS</div>
      </header>

      <div className="wl-main">
        <section className="wl-col">
          {joined ? (
            <div className="wl-stack wl-stack--in">
              <Disco happy />
              <div className="wl-copy">
                <h1>You’re in.</h1>
                <p className="wl-lede">
                  {position && (count ?? 0) >= SHOW_NUMBERS_FROM ? <>You’re number {fmt(position)} in line. </> : <>You’re in line. </>}
                  {device === "android" ? "iPhone goes first; I’ll tell you the day Android lands." : "I’ll email you the day it lands, and maybe once before."} Until then, the remote is still your problem.
                </p>
              </div>
              <div className="wl-actions">
                <button type="button" className="wl-share" onClick={share}>Tell the people you watch with</button>
                {toast && <span className="wl-toast" role="status">{toast}</span>}
              </div>
            </div>
          ) : (
            <div className="wl-stack wl-stack--form" style={{ opacity: travelling ? 0 : 1 }}>
              <Disco happy={false} />
              <div className="wl-copy">
                <h1>I’m nearly ready to pick for you.</h1>
                <p className="wl-lede">An app that ends the forty-minute scroll before anyone presses play. You tell me how tonight feels, I find a film that’s on your services right now, and everyone on the sofa gets a say. iOS first, Android after. Leave your email and I’ll tell you the day it lands.</p>
              </div>

              <div className="wl-me">
                <button type="button" data-wl="picker" className="wl-me-btn" aria-label="Change your mark" style={{ visibility: travelling ? "hidden" : "visible" }} onClick={shuffle}>
                  <Avatar key={`me${pulse}`} mark={me} size={72} anim={pulse ? "wl-pulse 600ms cubic-bezier(.2,1,.3,1) 1" : ""} />
                </button>
                <div className="wl-me-text">
                  <div className="wl-me-title">This is you in line.</div>
                  <button type="button" className="wl-me-link" onClick={shuffle}>Not you? Tap for another.</button>
                </div>
              </div>

              <div className="wl-device">
                <span id="wl-dev-lead" className="wl-device-lead">What do you watch on?</span>
                <div role="radiogroup" aria-labelledby="wl-dev-lead" className="wl-seg">
                  {(["ios", "android"] as const).map((d) => (
                    <button key={d} type="button" role="radio" id={`wl-dev-${d}`} className="wl-seg-opt" aria-checked={device === d}
                      tabIndex={(device ?? "ios") === d ? 0 : -1} onClick={() => setDevice(d)} onKeyDown={deviceKey} disabled={busy}>
                      <span>{d === "ios" ? "iPhone" : "Android"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <form className="wl-form" onSubmit={submit} noValidate>
                <div className="wl-row">
                  <input className="wl-input" type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false} placeholder="you@somewhere.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }} aria-label="Email" aria-invalid={!!error} aria-describedby="wl-note" disabled={busy} />
                  <button type="submit" className="wl-submit" disabled={busy}>{busy ? "Joining…" : "Join the waitlist"}</button>
                </div>
                <div id="wl-note" role="status" aria-live="polite">
                  {error ? <div className="wl-err">{error}</div> : <div className="wl-fine">One email the day it lands, maybe one before. Nothing else.</div>}
                </div>
              </form>
            </div>
          )}
        </section>

        <section className="wl-queue-col" aria-label="Who is already waiting">
          <div className="wl-queue">
            {(joined || travelling) && (
              <div data-wl="slot" className="wl-person">
                <span className="wl-pill wl-pill--me" style={{ opacity: joined ? 1 : 0 }}>Finally.</span>
                <span style={{ display: "inline-flex", visibility: joined ? "visible" : "hidden" }}><Avatar mark={me} size={136} /></span>
              </div>
            )}
            {QUEUE.map((p, i) => {
              const say = (joined && p.react) || p.say;
              return (
                <div key={i} className="wl-person" style={{ animationDelay: `${(i * 0.45) % 4}s` }}>
                  {say && <span className="wl-pill">{say}</span>}
                  <Avatar mark={p} size={p.size * 2} anim={hop(i)} react={joined} />
                </div>
              );
            })}
          </div>
          {/* Only once a real count has loaded: "several" under the threshold, the number from it up. */}
          {count !== null && count > 0 && (
            <p className="wl-count"><b>{count >= SHOW_NUMBERS_FROM ? `${fmt(count)} people` : "Several people"}</b> are already in line. Most of them said “I don’t mind.” I mind.</p>
          )}
        </section>
      </div>

      <footer className="wl-foot">
        <svg className="wl-waves" viewBox="0 0 1080 240" preserveAspectRatio="none" aria-hidden="true">
          <path d="M -60 70 C 300 70, 460 -20, 700 24 C 880 56, 960 70, 1140 70" style={{ stroke: "var(--mood-coral)" }} />
          <path d="M -60 132 C 300 132, 460 42, 700 86 C 880 118, 960 132, 1140 132" style={{ stroke: "var(--mood-lilac)" }} />
          <path d="M -60 194 C 300 194, 460 104, 700 148 C 880 180, 960 194, 1140 194" style={{ stroke: "var(--mood-lagoon)" }} />
        </svg>
        <div className="wl-links">
          <a href="https://www.instagram.com/whatshouldwewatch.app/" target="_blank" rel="noopener">@whatshouldwewatch.app</a>
          <a href="/wsww/app/privacy.html">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
