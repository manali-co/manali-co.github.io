"use client";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { track } from "./Telemetry";
import "@/styles/wsww-home.css";

/* wsww.app, the app's home on the web. A 1:1 port of Claude Design's marketing/web/wsww-home v2.dc.html
   at stage "live" (board: "wsww.app v2 - board"): the page is the app's own loop at page scale, driven
   by scroll alone. One scroll listener and one rAF write progress (--p1…--p4), the deck's card
   transforms (--c0…--c5), fades (--o*), decision pills (--s*), button swells (--b*) and the trailer
   (--open) onto the page root; the compositions are plain CSS reading them. Disco, the narrator, is a
   zero-height sticky layer drawn over the hero, the corner or the close, wherever the scroll says.
   Nothing plays on load and the page is complete at scroll 0 and at the bottom. */

const STRIPE = "repeating-linear-gradient(135deg, transparent 0 12px, rgba(242,241,238,.08) 12px 13px)";
const SHOW_NUMBERS_FROM = 50;

// The five that leave, top of the stack first: pass, like, maybe, seen it, like. Paddington 2 is the sixth.
const DECISION = { pass: ["✕", "Pass", "#E0626C"], like: ["✓", "Like", "#62C79A"], maybe: ["↑", "Maybe", "#F2F1EE"], seen: ["↓", "Seen it", "#F2F1EE"] } as const;
const CARDS = [
  { title: "Game Night", service: "Netflix", tile: "N", meta: "2018 · 1 h 40 m", why: "Loud, fast and over by eleven.", tint: "#3A4A5E", pill: "Trailer · 2:31", d: "pass" },
  { title: "Knives Out", service: "Max", tile: "M", meta: "2019 · 2 h 10 m", why: "A whodunit with jokes. You liked Glass Onion.", tint: "#5B3F3A", pill: "Trailer · 2:27", d: "like" },
  { title: "Moonstruck", service: "Max", tile: "M", meta: "1987 · 1 h 42 m", why: "Big feelings, big laughs, under two hours.", tint: "#6C4B6E", pill: "Trailer · 1:58", d: "maybe" },
  { title: "Big Night", service: "Prime", tile: "P", meta: "1996 · 1 h 49 m", why: "Two brothers, one perfect dinner.", tint: "#7A5A2E", pill: "Teaser · 0:48", d: "seen" },
  { title: "The Grand Budapest Hotel", service: "Hulu", tile: "H", meta: "2014 · 1 h 39 m", why: "Symmetry and pastry. You rated three Anderson films yes.", tint: "#8A5A3C", pill: "Trailer · 1:48", d: "like" },
] as const;
const REST = [
  { n: 2, title: "The Grand Budapest Hotel", meta: "Hulu · 1 h 39 m", tint: "#8A5A3C", yes: true },
  { n: 3, title: "Knives Out", meta: "Max · 2 h 10 m", tint: "#5B3F3A", yes: true },
  { n: 4, title: "Moonstruck", meta: "Max · 1 h 42 m", tint: "#6C4B6E", yes: false },
];
const WORDS: [string, string][] = [["slow burn", "lilac"], ["a mind-bender", "sky"], ["properly scary", "moss"], ["date night", "lagoon"], ["cry it out", "coral"], ["big laughs", "butter"], ["something true", "moss"]];
const SERVICES = ["Netflix", "Max", "Hulu", "Disney+", "Apple TV+", "Prime Video", "Peacock"];

// The deck's flings: direction (% of the card), tilt, and which button swells with it.
const DIRS = [{ x: -150, y: -4, r: -18, act: 0 }, { x: 150, y: -4, r: 18, act: 2 }, { x: 0, y: -130, r: 0, act: 1 }, { x: 0, y: 130, r: 0, act: 3 }, { x: 150, y: -4, r: 18, act: 2 }];

type Pose = "idle" | "thinking" | "busy" | "found" | "split" | "celebrate";
const POSES: Record<Pose, { say: string; discs: string[]; radii?: string[]; lead: number | null; eyes: string; mouth: keyof typeof MOUTHS; breathe?: boolean; orbit?: boolean; people?: boolean; bounce?: boolean }> = {
  idle: { say: "", discs: ["", "", ""], lead: null, eyes: "", mouth: "smile", breathe: true },
  thinking: { say: "Say it however it comes.", discs: ["translate(-2px, 2px) scale(.92)", "translate(4px, -6px) scale(1.16) rotate(-18deg)", "scale(.92)"], radii: ["50%", "58% 42% 50% 50% / 50% 58% 42% 50%", "50%"], lead: 1, eyes: "translate(5px, -2px)", mouth: "line", breathe: true },
  busy: { say: "Ten, all on your services.", discs: ["scale(.94)", "scale(.94)", "scale(.94)"], lead: 2, eyes: "scaleY(.6)", mouth: "line", orbit: true },
  found: { say: "Found it.", discs: ["translate(0, 6px) scale(1.04)", "translate(4px, -2px) scale(1.04)", "translate(-2px, -4px) scale(1.16)"], lead: 2, eyes: "scale(1.1)", mouth: "smile-big", breathe: true },
  split: { say: "One for everyone.", discs: ["translate(-70px, 32px) scale(.86)", "translate(16.8px, .6px) scale(.86)", "translate(53.2px, .6px) scale(.86)"], lead: null, people: true, eyes: "", mouth: "smile" },
  celebrate: { say: "", discs: ["translate(0, -4px) scale(1.12)", "scale(.96)", "scale(.96)"], lead: 0, eyes: "scale(1.1)", mouth: "grin", bounce: true },
};
const MOUTHS = {
  smile: { left: "55.5px", top: "74px", width: "9px", height: "5.5px", borderBottom: "1.7px solid var(--mood-on-fill)", borderTop: "0", borderRadius: "0 0 50% 50% / 0 0 100% 100%", background: "transparent", transform: "" },
  "smile-big": { left: "49px", top: "72px", width: "22px", height: "12px", borderBottom: "2px solid var(--mood-on-fill)", borderTop: "0", borderRadius: "0 0 50% 50% / 0 0 100% 100%", background: "transparent", transform: "" },
  line: { left: "54px", top: "76px", width: "12px", height: "0", borderBottom: "0", borderTop: "2px solid var(--mood-on-fill)", borderRadius: "99px", background: "transparent", transform: "translateX(4px)" },
  grin: { left: "51px", top: "74px", width: "18px", height: "10px", borderBottom: "0", borderTop: "0", borderRadius: "0 0 50% 50% / 0 0 100% 100%", background: "var(--mood-on-fill)", transform: "" },
} satisfies Record<string, Partial<CSSStyleDeclaration>>;

// The waitlist's own error copy, in Disco's voice (Waitlist.dc.html).
const ERR_EMAIL = "That email doesn’t look right. Have another go.";
const ERR_DOWN = "I couldn’t confirm that. Try again in a minute; joining twice is fine.";
const ERR_THROWAWAY = "I need an inbox that’ll still be there on launch day.";
const ERR_SLOW_DOWN = "Easy. Give it a minute and try again.";
const ERR_UNREACHABLE = (domain: string) => `Nothing at ${domain} takes email. Typo?`;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Mark({ size }: { size: 22 | 24 | 28 }) {
  const g = { 22: [4.6, 2.4, 1.5, 7.3, 7.7, 12.8], 24: [5, 2.6, 1.7, 7.9, 8.4, 13.9], 28: [5.9, 3.1, 2, 9.3, 9.8, 16.2] }[size];
  const d = (left: number, top: number): CSSProperties => ({ left, top, width: g[5], height: g[5] });
  return (
    <span className="wh-mark" style={{ width: size, height: size }} aria-hidden="true">
      <span className="wh-disc wh-coral" style={d(g[0], g[1])} />
      <span className="wh-disc wh-lilac" style={d(g[2], g[3])} />
      <span className="wh-disc wh-lagoon" style={d(g[4], g[3])} />
    </span>
  );
}

function Badge({ href, where }: { href: string; where: string }) {
  // Apple's official badge (the board's call), black on light and white on dark, 56 tall.
  return (
    <a className="wh-badge" href={href} target="_blank" rel="noopener" aria-label="Download on the App Store" onClick={() => track("wsww_home_store", { where })}>
      <picture>
        <source srcSet="/brand/app-store-badge-white.svg" media="(prefers-color-scheme: dark)" />
        <img src="/brand/app-store-badge-black.svg" alt="" width={168} height={56} />
      </picture>
    </a>
  );
}

export function WsswHome({ storeUrl }: { storeUrl: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [androidOpen, setAndroidOpen] = useState<"hero" | "close" | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(0);

  // The Android line's count. The API reports Android joiners on their own; until it does, no line.
  useEffect(() => {
    fetch("/api/waitlist/?platform=android", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (b && Number.isInteger(b.android)) setWaiting(b.android); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
    const px = Array.from(el.querySelectorAll<HTMLElement>("[data-px]"));
    const progs = Array.from(el.querySelectorAll<HTMLElement>("[data-prog]"));
    const chapters = Array.from(el.querySelectorAll<HTMLElement>("[data-chapter]"));
    const wrap = q<HTMLElement>("[data-narr-wrap]"), n = q<HTMLElement>("[data-narr]"), say = q<HTMLElement>("[data-narr-say]");
    const hero = q<HTMLElement>("[data-hero-disco]"), close = q<HTMLElement>("[data-close-disco]");
    const discs = Array.from(n.querySelectorAll<HTMLElement>("[data-disc]"));
    const eyes = Array.from(n.querySelectorAll<HTMLElement>("[data-eye]"));
    const mouth = q<HTMLElement>("[data-mouth]"), face = q<HTMLElement>("[data-narr-face]"), people = q<HTMLElement>("[data-narr-people]");
    const breathe = q<HTMLElement>("[data-narr-breathe]"), group = q<HTMLElement>("[data-narr-discs]");
    const set = (k: string, v: string) => el.style.setProperty(k, v);
    let pose: Pose | "" = "";

    const applyPose = (p: Pose) => {
      pose = p;
      const P = POSES[p];
      const noT = reduced ? "none" : "";
      discs.forEach((d, i) => { d.style.transition = noT; d.style.transform = P.discs[i] || ""; d.style.borderRadius = P.radii?.[i] || "50%"; d.style.zIndex = P.lead === i ? "2" : "1"; });
      face.style.opacity = P.people ? "0" : "1";
      people.style.opacity = P.people ? "1" : "0";
      eyes.forEach((e) => { e.style.transition = noT; e.style.transform = P.eyes; });
      mouth.style.transition = noT;
      Object.assign(mouth.style, MOUTHS[P.mouth]);
      breathe.style.animation = reduced ? "none" : P.bounce ? "wsww-bounce 1.1s cubic-bezier(.3,0,.2,1) infinite" : P.breathe ? "wsww-breathe 5s ease-in-out infinite" : "none";
      group.style.animation = reduced ? "none" : P.orbit ? "wsww-orbit 7s linear infinite" : "none";
      if (P.say) say.textContent = P.say;
    };

    const update = () => {
      const vh = window.innerHeight;
      if (!vh) return;
      const y = window.scrollY;
      // depth: discs and a few compositions move at a speed of their own
      for (const p of px) {
        if (reduced) { p.style.transform = ""; continue; }
        const speed = parseFloat(p.dataset.px || "1");
        if (p.dataset.pxFrom === "top") { p.style.transform = `translate3d(0, ${(y * (1 - speed)).toFixed(1)}px, 0)`; continue; }
        const r = p.getBoundingClientRect();
        const cur = parseFloat(p.dataset.ty || "0");
        const ty = (r.top + r.height / 2 - cur - vh / 2) * (speed - 1);
        p.dataset.ty = String(ty);
        p.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
      }
      // progress: 0 → 1 while a composition's top travels from data-start to data-end of the viewport
      const P: Record<string, number> = {};
      for (const s of progs) {
        const top = s.getBoundingClientRect().top;
        const start = parseFloat(s.dataset.start || "0.85"), end = parseFloat(s.dataset.end || "0.35");
        let p = clamp((start * vh - top) / ((start - end) * vh), 0, 1);
        if (reduced) p = top < vh * 0.9 ? 1 : 0;
        P[s.dataset.prog!] = p;
        set("--p" + s.dataset.prog, p.toFixed(3));
      }
      // the deck: five cards leave in turn over p2 ∈ [0, .8]; the last one opens its trailer over [.8, 1].
      // Reduced motion lands on the open Paddington 2.
      const p2 = P[2] || 0, seg = 0.16;
      const bump = [0, 0, 0, 0];
      for (let k = 0; k < 5; k++) {
        const t = clamp((p2 - k * seg) / seg, 0, 1), te = easeOut(t), d = DIRS[k];
        const idx = Math.max(0, k - p2 / seg);
        set("--c" + k, t > 0 ? `translate3d(${(d.x * te).toFixed(1)}%, ${(d.y * te).toFixed(1)}%, 0) rotate(${(d.r * te).toFixed(1)}deg)` : `translate3d(0, ${(idx * 10).toFixed(1)}px, 0) scale(${(1 - idx * 0.035).toFixed(3)})`);
        set("--o" + k, (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1).toFixed(3));
        set("--s" + k, clamp(t * 3, 0, 1).toFixed(3));
        bump[d.act] = Math.max(bump[d.act], 4 * t * (1 - t));
      }
      const idx5 = Math.max(0, 5 - p2 / seg);
      set("--c5", `translate3d(0, ${(idx5 * 10).toFixed(1)}px, 0) scale(${(1 - idx5 * 0.035).toFixed(3)})`);
      set("--open", clamp((p2 - 0.8) / 0.2, 0, 1).toFixed(3));
      bump.forEach((b, j) => set("--b" + j, (1 + 0.18 * b).toFixed(3)));
      // the narrator: hero → corner over the first 45 % of a viewport, corner → close as the close's slot
      // passes 85 % → 45 %. A function of position, so scrolling back reverses it exactly.
      const wr = wrap.getBoundingClientRect(), hr = hero.getBoundingClientRect(), cr = close.getBoundingClientRect();
      const right = el.getBoundingClientRect().right; // the page's own edge, never under a scrollbar
      const small = el.clientWidth < 600, ds = small ? 48 : 56, s = ds / 120;
      const dock = { x: right - 24 - ds, y: 60 + 14 };
      const dockP = reduced ? (y > 10 ? 1 : 0) : smooth(clamp(y / (vh * 0.45), 0, 1));
      const unP = reduced ? (cr.top < vh * 0.85 ? 1 : 0) : smooth(clamp((vh * 0.85 - cr.top) / (vh * 0.4), 0, 1));
      let X = lerp(hr.left, dock.x, dockP), Y = lerp(hr.top, dock.y, dockP), S = lerp(1, s, dockP);
      X = lerp(X, cr.left, unP); Y = lerp(Y, cr.top, unP); S = lerp(S, 1, unP);
      n.style.transform = `translate3d(${(X - wr.left).toFixed(1)}px, ${(Y - wr.top).toFixed(1)}px, 0) scale(${S.toFixed(4)})`;
      // the pose follows the chapter whose top has passed 55 % of the viewport
      let chapter = 0;
      for (const c of chapters) if (c.getBoundingClientRect().top < vh * 0.55) chapter = Math.max(chapter, Number(c.dataset.chapter));
      const next: Pose = unP > 0.5 ? "celebrate" : chapter === 4 ? "split" : chapter === 3 ? "found" : chapter === 2 ? "busy" : chapter === 1 ? "thinking" : "idle";
      if (next !== pose) applyPose(next);
      const docked = dockP > 0.999 && unP < 0.001 && next !== "idle";
      say.style.opacity = docked ? "1" : "0";
      const shift = next === "split" ? -22 : 0;
      say.style.transform = `translate3d(${(dock.x - 10 + shift - wr.left).toFixed(1)}px, ${(dock.y + ds / 2 - wr.top).toFixed(1)}px, 0) translate(-100%, -50%)`;
      wrap.dataset.ready = "1";
    };

    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    document.fonts?.ready.then(onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const openAndroid = (where: "hero" | "close") => { setAndroidOpen(where); track("wsww_home_android_open", { where }); };

  async function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) { setError(ERR_EMAIL); return; }
    const website = (new FormData(e.currentTarget).get("website") as string) || "";
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/waitlist/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: value, platform: "android", website }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { setSent(true); track("wsww_android_join"); return; }
      const code = body?.error?.code || body?.code;
      setError(res.status === 429 ? ERR_SLOW_DOWN : code === "disposable_email" ? ERR_THROWAWAY : code === "undeliverable_email" ? ERR_UNREACHABLE(value.split("@")[1]) : res.status === 400 ? ERR_EMAIL : ERR_DOWN);
    } catch {
      setError(ERR_DOWN);
    } finally {
      setBusy(false);
    }
  }

  const count = waiting < SHOW_NUMBERS_FROM ? "Several people are waiting for Android." : `${waiting.toLocaleString("en-US")} people are waiting for Android.`;
  const get = (where: "hero" | "close") => (
    <div className="wh-get" id={where === "hero" ? "get" : undefined}>
      <Badge href={storeUrl} where={where} />
      {sent ? (
        <span className="wh-sent" role="status">Thanks. I’ll write the day it’s on Android.</span>
      ) : androidOpen === where ? (
        <>
          <form className="wh-form" onSubmit={join} noValidate>
            <label className="wh-sr" htmlFor={`wh-email-${where}`}>Email</label>
            <input id={`wh-email-${where}`} className="wh-input" type="email" name="email" inputMode="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} autoFocus aria-describedby={`wh-note-${where}`} aria-invalid={error ? true : undefined} />
            <span className="wh-hp" aria-hidden="true"><input type="text" name="website" tabIndex={-1} autoComplete="off" /></span>
            <button className="wh-btn" type="submit" disabled={busy}>Tell me</button>
          </form>
          <span id={`wh-note-${where}`} className={`wh-note${error ? " wh-note--err" : ""}`} role={error ? "alert" : undefined}>{error || (waiting > 0 ? count : "")}</span>
        </>
      ) : (
        <span className="wh-line">Android? <button type="button" className="wh-link" onClick={() => openAndroid(where)}>Tell me when.</button></span>
      )}
    </div>
  );

  return (
    <div className="wh" ref={root}>
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600&display=swap" />
      <div className="wh-narr-wrap" data-narr-wrap aria-hidden="true">
        <div className="wh-narr" data-narr>
          <div className="wh-narr-breathe" data-narr-breathe>
            <div className="wh-narr-discs" data-narr-discs>
              <span data-disc="coral" className="wh-coral" style={{ left: 25.2, top: 8.2 }} />
              <span data-disc="lilac" className="wh-lilac" style={{ left: 8.4, top: 39.6 }} />
              <span data-disc="lagoon" className="wh-lagoon" style={{ left: 42, top: 39.6 }} />
            </div>
            <div className="wh-narr-face" data-narr-face>
              <span className="wh-eye" data-eye="l" style={{ left: 47.7 }} />
              <span className="wh-eye" data-eye="r" style={{ left: 63.3 }} />
              <span className="wh-mouth" data-mouth />
            </div>
            <div className="wh-narr-people" data-narr-people>
              <span className="wh-person" style={{ left: -10 }}><span className="e" style={{ left: -9 }} /><span className="e" style={{ left: 3 }} /><span className="smile" /></span>
              <span className="wh-person" style={{ left: 60 }}><span className="e" style={{ left: -9 }} /><span className="e" style={{ left: 3 }} /><span className="flat" /></span>
              <span className="wh-person" style={{ left: 130 }}><span className="e" style={{ left: -9 }} /><span className="e" style={{ left: 3 }} /><span className="smile" /></span>
            </div>
          </div>
        </div>
        <div className="wh-say" data-narr-say>Say it however it comes.</div>
      </div>

      <header className="wh-head">
        <div className="wh-head__in">
          <a href="#top" className="wh-brand"><Mark size={28} />What Should We Watch</a>
          <a href={storeUrl} className="wh-ghost" target="_blank" rel="noopener" onClick={() => track("wsww_home_store", { where: "header" })}>App Store</a>
        </div>
      </header>

      <section id="top" className="wh-hero">
        <span data-px="0.35" data-px-from="top" aria-hidden="true" className="wh-disc wh-coral wh-px wh-hero__d1" />
        <span data-px="0.55" data-px-from="top" aria-hidden="true" className="wh-disc wh-lagoon wh-px wh-hero__d2" />
        <span data-px="0.25" data-px-from="top" aria-hidden="true" className="wh-disc wh-lilac wh-px wh-hero__d3" />
        <div className="wh-hero__col">
          <span data-hero-disco className="wh-slot" />
          <span className="wh-micro">For iPhone · an app by Manali</span>
          <h1 className="wh-h1">What should we watch?</h1>
          <p className="wh-sub">Pick a mood or two. I find ten films that are on your services tonight. You swipe. One verdict.</p>
          {get("hero")}
        </div>
      </section>

      <section data-chapter="1" className="wh-ch">
        <div className="wh-grid">
          <div className="wh-copy">
            <span className="wh-micro">1 · Tonight feels like…</span>
            <h2 className="wh-h2">Say how tonight feels, not what to search.</h2>
            <p className="wh-body">Cozy. Funny. A mind-bender. Pick a word or two, or describe it yourself. The words pour into the sentence, and I take it from there.</p>
          </div>
          <div data-prog="1" data-start="0.92" data-end="0.3" className="wh-sentence-wrap" aria-hidden="true">
            <span className="wh-micro">Sunday · 9:41 pm · autumn</span>
            <div className="wh-sentence"><span>Tonight feels like</span><span className="wh-chip wh-chip--cozy">cozy</span><span>and</span><span className="wh-nowrap"><span className="wh-chip wh-chip--funny">funny</span><span>.</span></span></div>
            <div className="wh-for">for <span>the two of us</span>, with <span>about 2 hours</span></div>
            <div className="wh-field">
              {WORDS.map(([w, hue]) => <span key={w} className={`wh-word wh-word--${hue}`}>{w}</span>)}
              <span className="wh-word wh-word--own">describe it yourself</span>
            </div>
            <div className="wh-deal"><span>Deal ten</span></div>
          </div>
        </div>
      </section>

      <section data-chapter="2" className="wh-ch wh-ch--deep">
        <div className="wh-grid">
          <div data-prog="2" data-start="0.62" data-end="0.1" className="wh-deckcol" aria-hidden="true">
            <div className="wh-deckhead"><span className="wh-deckhead__l"><span className="wh-micro">Tonight</span><span className="wh-cap">cozy · funny</span></span><span className="wh-undo"><b>↺</b>Undo</span></div>
            <div className="wh-stack">
              <div className="wh-card wh-card--last" style={{ transform: "var(--c5)" }}>
                <div className="wh-player">
                  <div className="wh-player__art wh-stripe--fine" />
                  <div className="wh-player__bar"><span className="wh-player__ch"><i /><span>Paddington 2 | Official Trailer</span></span><span className="wh-player__tools"><span>⊕</span><span>↗</span></span></div>
                  <span className="wh-yt"><i /></span>
                </div>
                <div className="wh-under">
                  <div className="wh-under__top"><span className="wh-under__svc"><span className="wh-under__tile">N</span><span className="wh-under__name">Netflix</span></span><span className="wh-under__close"><b>✕</b>Close trailer</span></div>
                  <span className="wh-under__title">Paddington 2</span>
                  <span className="wh-under__meta">2017 · 1 h 43 m · leaves in 4 days</span>
                  <span className="wh-under__why">You said cozy and funny. This is both, and it leaves Netflix on Friday.</span>
                </div>
                <div className="wh-poster wh-stripe">
                  <span className="wh-glass wh-glass--trailer"><span className="wh-play" />Trailer · 2:14</span>
                  <div className="wh-cardtext">
                    <span className="wh-svc"><span className="wh-tile">N</span><span className="wh-svcname">Netflix</span></span>
                    <span className="wh-cardtitle">Paddington 2</span>
                    <span className="wh-cardmeta">2017 · 1 h 43 m</span>
                    <span className="wh-cardwhy">You said cozy and funny. This is both, and it leaves Netflix on Friday.</span>
                  </div>
                </div>
              </div>
              {CARDS.map((c, i) => ({ c, i })).reverse().map(({ c, i }) => {
                const [glyph, decision, glyphColor] = DECISION[c.d];
                return (
                  <div key={c.title} className="wh-card" style={{ background: `${STRIPE}, ${c.tint}`, transform: `var(--c${i})`, opacity: `var(--o${i})` }}>
                    <span className="wh-glass wh-glass--decision" style={{ opacity: `var(--s${i})`, transform: `scale(calc(.9 + .1 * var(--s${i})))` }}><b style={{ color: glyphColor }}>{glyph}</b>{decision}</span>
                    <span className="wh-glass wh-glass--trailer"><span className="wh-play" />{c.pill}</span>
                    <div className="wh-cardtext">
                      <span className="wh-svc"><span className="wh-tile">{c.tile}</span><span className="wh-svcname">{c.service}</span></span>
                      <span className="wh-cardtitle">{c.title}</span>
                      <span className="wh-cardmeta">{c.meta}</span>
                      <span className="wh-cardwhy">{c.why}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="wh-acts">
              <span className="wh-act wh-act--pass"><i style={{ transform: "scale(var(--b0))" }}>✕</i><span className="wh-micro">Pass</span></span>
              <span className="wh-act"><i style={{ transform: "scale(var(--b1))" }}>↑</i><span className="wh-micro">Maybe</span></span>
              <span className="wh-act wh-act--like"><i style={{ transform: "scale(var(--b2))" }}>✓</i><span className="wh-micro">Like</span></span>
              <span className="wh-act"><i style={{ transform: "scale(var(--b3))" }}>↓</i><span className="wh-micro">Seen it</span></span>
            </div>
            <div className="wh-hint"><span className="wh-micro" style={{ opacity: "calc(1 - var(--open))" }}>or swipe · tap the poster for the trailer</span><span className="wh-micro" style={{ opacity: "var(--open)" }}>or swipe the words · it stops when the card goes</span></div>
          </div>
          <div className="wh-copy wh-copy--deck">
            <span className="wh-micro">2 · Ten films, all on your services</span>
            <h2 className="wh-h2">Swipe ten you can actually watch tonight.</h2>
            <p className="wh-body">Only films on the services you already pay for, in your country, right now. Pass, maybe, like, seen it. The trailer plays right on the card.</p>
            <div className="wh-services">{SERVICES.map((s) => <span key={s}>{s}</span>)}</div>
          </div>
        </div>
      </section>

      <section data-chapter="3" className="wh-ch wh-ch--verdict">
        <div className="wh-grid">
          <div data-px="1.08" className="wh-copy wh-px">
            <span className="wh-micro">3 · One verdict</span>
            <h2 className="wh-h2">Tonight, Paddington 2.</h2>
            <p className="wh-body">The one you were surest about, with why, and Watch now straight into Netflix. Tomorrow morning I ask how it went, and I’m a little better at your nights.</p>
          </div>
          <div data-prog="3" data-start="0.9" data-end="0.4" className="wh-verdict" aria-hidden="true">
            <span className="wh-micro wh-rise wh-rise--1">Your pick</span>
            <div className="wh-pick wh-rise wh-rise--2">
              <div className="wh-thumb wh-stripe--fine"><span className="wh-thumb__tag"><i />Trailer</span><span className="wh-thumb__title">Paddington 2</span></div>
              <div className="wh-pick__info">
                <span className="wh-pick__svc"><span className="wh-pick__tile">N</span><span className="wh-pick__name">Netflix · your pick</span></span>
                <span className="wh-pick__title">Paddington 2</span>
                <span className="wh-pick__meta">2017 · 1 h 43 m · leaves in 4 days</span>
                <span className="wh-pick__why">You said cozy and funny. This is both, and it leaves Netflix on Friday.</span>
                <span className="wh-pick__cta"><span>Watch now on Netflix</span></span>
              </div>
            </div>
            <div className="wh-rest wh-rise wh-rise--3">
              <span className="wh-micro wh-rest__label">The rest, by fit</span>
              {REST.map((r) => (
                <div key={r.n} className="wh-row">
                  <span className="wh-row__n">{r.n}</span>
                  <span className="wh-row__art" style={{ background: `${STRIPE}, ${r.tint}` }} />
                  <span className="wh-row__text"><span className="wh-row__title">{r.title}</span><span className="wh-row__meta">{r.meta}</span></span>
                  <span className="wh-row__play">▶</span>
                  <span className="wh-row__dot" style={{ background: r.yes ? "var(--color-yes)" : "var(--color-ink-tertiary)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section data-chapter="4" className="wh-ch wh-ch--room">
        <div className="wh-grid">
          <div className="wh-copy">
            <span className="wh-micro wh-room-kicker">With people · and on more screens</span>
            <h2 className="wh-h2">One screen for the room, one phone each.</h2>
            <p className="wh-body wh-room-body">On an iPhone Duo the poster gets a display of its own. And soon, on the TV: one shared deck for the couch, private votes on every phone, one verdict for everyone.</p>
          </div>
          <div data-prog="4" data-start="0.9" data-end="0.4" data-px="0.94" className="wh-room wh-px" aria-hidden="true">
            <div className="wh-room__top">
              <span className="wh-room__name"><Mark size={24} />The Flat · 4 of 5 here</span>
              <span className="wh-room__code"><span>wsww.app/j · KQ7W3D</span><span className="wh-soon">TV · soon</span></span>
            </div>
            <div className="wh-room__film">
              <div className="wh-thumb wh-stripe--fine"><span className="wh-thumb__title">Paddington 2</span></div>
              <div className="wh-room__info"><span className="wh-room__title">Paddington 2</span><span className="wh-room__meta">Netflix · 2017 · 1 h 43 m</span><span className="wh-room__why">Cozy and funny for all four of you, and it leaves on Friday.</span></div>
            </div>
            <div className="wh-votes">
              <div className="wh-votes__top"><span className="wh-micro">Votes · 3 of 4 in</span><span className="wh-voters"><span style={{ background: "#E8796F" }}>M</span><span style={{ background: "#AE9BE0" }}>J</span><span style={{ background: "#4DBFB0" }}>S</span><span className="k">K</span></span></div>
              <span className="wh-bar"><span /></span>
              <span className="wh-votes__note">Votes are private. The room only sees the count, then the verdict.</span>
            </div>
          </div>
        </div>
      </section>

      <section data-close className="wh-close">
        <span data-px="0.6" aria-hidden="true" className="wh-disc wh-lilac wh-px wh-close__d1" />
        <span data-px="0.4" aria-hidden="true" className="wh-disc wh-coral wh-px wh-close__d2" />
        <div className="wh-close__col">
          <span data-close-disco className="wh-slot" />
          <h2 className="wh-close__h2">Ready when you are.</h2>
          <p className="wh-close__p">Free to start, no account needed to swipe. Your first deck takes about a minute.</p>
          {get("close")}
        </div>
      </section>

      <footer className="wh-foot">
        <div className="wh-foot__in">
          <span className="wh-foot__name"><Mark size={22} />What Should We Watch · © 2026 Manali</span>
          {/* Full page loads on purpose: on wsww.app these paths are rewritten to the app's own legal and
              support pages, which client-side navigation would skip (this deployment's /privacy/ is the blog's). */}
          <nav aria-label="What Should We Watch">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/privacy/">Privacy</a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/terms/">Terms</a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/support/">Support and feedback</a>
            <a href="https://manali.page" target="_blank" rel="noopener">Made by Manali ↗</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
