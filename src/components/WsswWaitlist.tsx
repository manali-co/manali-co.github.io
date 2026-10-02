"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { site } from "@/lib/site";
import { track } from "./Telemetry";
import "@/styles/wsww-waitlist.css";

/* The What Should We Watch page while the app is in App Store review. A 1:1 port of Claude
   Design's marketing/web/Waitlist.dc.html (the app's design project): Disco asks for an email,
   you pick your mark, and on joining it flies to the front of the queue. Joins go through this
   site's /api/waitlist/ to the app's own backend, which hands back your place in line. */

type Hue = "coral" | "lilac" | "lagoon" | "butter" | "moss" | "sky";
type Mark = { hue: Hue; shape: keyof typeof SHAPES; face: keyof typeof FACES };
type Face = { eyes: string; mouth: string; eyeScale?: number; mouthX?: number; eyesY?: number; lookX?: number };

const HUES: Hue[] = ["coral", "lilac", "lagoon", "butter", "moss", "sky"];
const SHAPES = {
  round: { r: "50%", sx: 1, sy: 1, rot: 0 },
  pebble: { r: "58% 42% 50% 50% / 50% 58% 42% 50%", sx: 1.04, sy: 0.96, rot: -8 },
  drop: { r: "50% 50% 46% 54% / 62% 62% 38% 38%", sx: 0.94, sy: 1.08, rot: 0 },
  bean: { r: "46% 54% 48% 52% / 54% 46% 54% 46%", sx: 1.1, sy: 0.9, rot: 12 },
  tall: { r: "50% 50% 46% 46% / 60% 60% 40% 40%", sx: 0.88, sy: 1.14, rot: 0 },
  squish: { r: "50% 50% 42% 42% / 62% 62% 38% 38%", sx: 1.14, sy: 0.84, rot: 0 },
};
const FACES: Record<string, Face> = {
  smile: { eyes: "dot", mouth: "smile" }, grin: { eyes: "arc", mouth: "grin" }, calm: { eyes: "line", mouth: "smile" },
  wink: { eyes: "wink", mouth: "smile" }, curious: { eyes: "dot", mouth: "o", eyeScale: 1.25 }, thinking: { eyes: "look", mouth: "line", mouthX: 18 },
  sleepy: { eyes: "line", mouth: "line", eyesY: 12 }, cheeky: { eyes: "dot", mouth: "smirk" }, deadpan: { eyes: "dot", mouth: "line" }, starry: { eyes: "big", mouth: "grin" },
};
const INK = "#17181B"; // faces are always graphite on single discs
const MORPH = "520ms cubic-bezier(.2,1,.3,1)";
// excited: round eyes glancing toward the newcomer (left), open grin. Sleepers stay asleep.
const EXCITED: Face = { eyes: "dot", mouth: "grin", lookX: -22, eyeScale: 1.15 };
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

function Avatar({ mark, size, anim, react }: { mark: Mark; size: number; anim?: string; react?: boolean }) {
  const { hue, shape, face } = mark;
  const sh = SHAPES[shape] || SHAPES.round;
  const f = react && face !== "sleepy" ? EXCITED : FACES[face] || FACES.smile;
  const eye = size * 0.11, gap = size * 0.2, stroke = Math.max(1.5, size * 0.03);
  const lid: CSSProperties = { height: eye * 0.5, background: "transparent", borderBottom: `${stroke}px solid ${INK}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%", boxSizing: "border-box" };
  const eyeStyle = (i: number): CSSProperties => {
    const b: CSSProperties = { width: eye, height: eye, borderRadius: "50%", background: INK, display: "block", transform: `translateX(${f.lookX || 0}%) scale(${f.eyeScale || 1})`, transition: `height ${MORPH}, border-radius ${MORPH}, transform ${MORPH}, background ${MORPH}, border ${MORPH}` };
    if (f.eyes === "arc") return { ...b, height: eye * 0.6, borderRadius: "60% 60% 40% 40%" };
    if (f.eyes === "line" || (f.eyes === "wink" && i === 1)) return { ...b, ...lid };
    if (f.eyes === "look") return { ...b, transform: "translate(22%, -22%) scale(.9)" };
    if (f.eyes === "big") return { ...b, transform: "scale(1.4)" };
    return b;
  };
  const mw = size * 0.22, mh = size * 0.12;
  const mouths: Record<string, CSSProperties> = {
    smile: { width: mw, height: mh, borderBottom: `${stroke}px solid ${INK}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%" },
    grin: { width: mw, height: mh * 1.2, background: INK, borderRadius: "0 0 50% 50% / 0 0 100% 100%" },
    line: { width: mw * 0.8, height: 0, borderTop: `${stroke}px solid ${INK}`, borderRadius: 99 },
    o: { width: mh, height: mh, border: `${stroke}px solid ${INK}`, borderRadius: "50%" },
    smirk: { width: mw * 0.7, height: mh, borderBottom: `${stroke}px solid ${INK}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%", transform: "translateX(20%) rotate(-10deg)" },
  };
  return (
    <span role="img" aria-label={`${hue} ${shape} ${face}`} style={{ position: "relative", display: "inline-flex", width: size, height: size, flex: "none", animation: anim || "none" }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: sh.r, background: `var(--mood-${hue})`, transform: `rotate(${sh.rot}deg) scale(${sh.sx}, ${sh.sy})` }} />
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: `${50 + (f.eyesY || 0) * 0.3}%`, width: gap + eye, height: eye, marginLeft: -(gap + eye) / 2, marginTop: -eye / 2 - size * 0.04, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={eyeStyle(0)} /><span style={eyeStyle(1)} />
      </span>
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "66%", transform: `translateX(calc(-50% + ${(f.mouthX || 0) * 0.01 * size}px))`, ...mouths[f.mouth], boxSizing: "border-box", transition: `all ${MORPH}` }} />
    </span>
  );
}

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
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMe(randomMe()));
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
      const res = await fetch("/api/waitlist/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: v, avatar: { hue: me.hue, shape: me.shape, face: me.face } }) });
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
                  I’ll email you the day it lands, and maybe once before. Until then, the remote is still your problem.
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
