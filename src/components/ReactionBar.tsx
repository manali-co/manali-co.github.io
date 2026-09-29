"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { track } from "./Telemetry";

/* Ported from the design system's ReactionBar (redesigned 29 Sep 2026). Five reactions, each with
   its own character and hue: the sun (the mark's sun behind its ridge, rising as people react), a
   coral heart, an indigo bulb (learned something), a lagoon laugh, a lilac rocket. Docked in the
   post footer with a label column; while reading, the same set lifts into a warm bottom-centre
   pill. Anonymous: one random id per browser, sent in a header, stored by the site's API. */
const REACTIONS = [
  { id: "sun", label: "Made my day", gesture: "ma-react-peek", d: "" },
  { id: "heart", label: "Loved it", gesture: "ma-react-beat", d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" },
  { id: "idea", label: "Learned something", gesture: "ma-react-glow", d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" },
  { id: "laugh", label: "Made me laugh", gesture: "ma-react-tilt", d: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" },
  { id: "rocket", label: "Ship it", gesture: "ma-react-lift", d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" },
] as const;
type Kind = (typeof REACTIONS)[number]["id"];
type Reaction = (typeof REACTIONS)[number];
type Data = { counts: Record<string, number>; mine: string[]; unavailable?: boolean; loaded?: boolean };

const SPARKS = [[-14, -18], [10, -20], [18, -6], [-18, 2], [6, 16], [-6, 18]];
const RIDGE = "M1.5 19C4.5 19 5.6 11 8.6 11S12.4 16.6 15 16.6 19.4 14.6 22.5 14.6";
const ABOVE = "M0 0H24V14.6C19.4 14.6 17.6 16.6 15 16.6S11.6 11 8.6 11 4.5 19 1.5 19H0Z";

/* Media queries without a hydration mismatch: the server renders the laptop, un-reduced view. */
function useMedia(q: string) {
  return useSyncExternalStore(
    (fn) => { const m = matchMedia(q); m.addEventListener("change", fn); return () => m.removeEventListener("change", fn); },
    () => matchMedia(q).matches,
    () => false,
  );
}

function clientId() {
  try {
    let id = localStorage.getItem("ma-client");
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("ma-client", id); }
    return id;
  } catch { return ""; }
}

/* The mark's sun behind its ridge. Nobody yet: below the hill, a sliver of gold. Others reacted:
   half up. You reacted: risen, with its halo. */
function SunGlyph({ state, size }: { state: "low" | "mid" | "up"; size: number }) {
  const clip = `ma-sun-${useId().replace(/:/g, "")}`;
  const dy = state === "up" ? 0 : state === "mid" ? 3.4 : 7;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={clip}><path d={ABOVE} /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <g className="react__sunrise" style={{ transform: `translateY(${dy}px)` }}>
          <circle cx="16.2" cy="8.4" r="7.2" fill="none" stroke="var(--halo)" strokeWidth="1.5" style={{ opacity: state === "up" ? 1 : 0, transition: "opacity var(--dur-base) var(--ease-out)" }} />
          <circle cx="16.2" cy="8.4" r="5" fill="var(--react-sun)" />
        </g>
      </g>
      <path d={RIDGE} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function Glyph({ r, mine, count }: { r: Reaction; mine: boolean; count: number }) {
  if (r.id === "sun") return <SunGlyph size={22} state={mine ? "up" : count > 0 ? "mid" : "low"} />;
  const solid = r.id === "heart";
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill={mine ? `var(--react-${r.id})` : "none"} fillOpacity={mine ? (solid ? 1 : 0.22) : 0} stroke={`var(--react-${r.id})`} strokeWidth={mine ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", transition: "fill-opacity var(--dur-base) var(--ease-out)" }}>
      <path d={r.d} />
    </svg>
  );
}

function Chip({ r, count, mine, onToggle, reduced, floating, tight, busy, onHint }: { r: Reaction; count: number; mine: boolean; onToggle: (k: Kind) => void; reduced: boolean; floating: boolean; tight: boolean; busy: boolean; onHint: (h: string | null) => void }) {
  const [hover, setHover] = useState(false);
  const [burst, setBurst] = useState(0);
  const [fresh, setFresh] = useState(false);
  const timer = useRef<number | null>(null);
  const zero = !count;
  const hue = `var(--react-${r.id})`, tint = `var(--react-${r.id}-tint)`;
  const fire = () => {
    if (busy) return;
    if (!mine && !reduced) {
      setBurst((b) => b + 1); setFresh(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFresh(false), 900);
    }
    onToggle(r.id);
  };
  const enter = () => { setHover(true); onHint(r.label); };
  const leave = () => { setHover(false); onHint(null); };
  const style: CSSProperties = {
    position: "relative", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 44, minWidth: 44, boxSizing: "border-box",
    padding: zero ? `0 ${tight ? 10 : 12}px` : `0 ${tight ? 10 : 14}px 0 ${tight ? 9 : 11}px`,
    borderRadius: "var(--radius-pill)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", fontWeight: mine ? 600 : 500, lineHeight: 1, isolation: "isolate",
    border: mine ? `1.5px solid ${hue}` : `1px solid ${floating ? "transparent" : hover ? "var(--border-strong)" : "var(--border)"}`,
    background: mine || hover ? tint : floating ? "transparent" : "var(--bg-raised)", color: mine ? "var(--text)" : "var(--text-2)",
    animation: fresh && !reduced ? "ma-react-pop 420ms var(--ease-settle)" : undefined,
    transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)",
  };
  return (
    <button type="button" onClick={fire} aria-pressed={mine} aria-label={`${r.label}${count ? `, ${count}` : ""}${mine ? ", you reacted" : ""}`} title={r.label}
      onMouseEnter={enter} onMouseLeave={leave} onFocus={enter} onBlur={leave} style={style}>
      {fresh && !reduced && (
        <span aria-hidden="true" key={burst} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: -1 }}>
          <span style={{ position: "absolute", left: "50%", top: "50%", width: 28, height: 28, margin: "-14px 0 0 -14px", borderRadius: "50%", background: r.id === "sun" ? "var(--halo)" : tint, animation: "ma-react-ripple 700ms var(--ease-out) forwards" }} />
          {SPARKS.map(([dx, dy], i) => <span key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 4, height: 4, margin: "-2px 0 0 -2px", borderRadius: "50%", background: hue, ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, animation: `ma-react-spark 560ms var(--ease-out) ${i * 30}ms forwards` }} />)}
        </span>
      )}
      <span style={{ display: "inline-flex", color: mine ? "var(--text)" : "var(--text-2)", animation: hover && !reduced && !fresh ? `${r.gesture} 640ms var(--ease-out)` : undefined }}><Glyph r={r} mine={mine} count={count} /></span>
      {!zero && <span key={count} style={{ fontVariantNumeric: "tabular-nums", display: "inline-block", animation: fresh && !reduced ? "ma-react-count 320ms var(--ease-out)" : undefined }}>{count}</span>}
    </button>
  );
}

/* Float between "a quarter of the way into the post" and "the bar's own place is on screen".
   Once the reader is past it (reply box, comments), it stays in place. */
function useFloating(anchor: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [floating, setFloating] = useState(false);
  useEffect(() => {
    const el = anchor.current;
    const article = document.querySelector("article.post");
    if (!enabled || !el || !article) return;
    const update = () => {
      const bar = el.getBoundingClientRect(), a = article.getBoundingClientRect();
      setFloating(-a.top / Math.max(1, a.height - innerHeight) > 0.25 && bar.top > innerHeight - 8);
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => { removeEventListener("scroll", update); removeEventListener("resize", update); };
  }, [anchor, enabled]);
  return enabled && floating;
}

const LABEL: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-3)" };

export function ReactionBar({ slug }: { slug: string }) {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const narrow = useMedia("(max-width: 640px)");
  const tiny = useMedia("(max-width: 480px)");
  const anchor = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const floating = useFloating(anchor, !dismissed);
  const [data, setData] = useState<Data>({ counts: {}, mine: [] });
  const [busy, setBusy] = useState(false);
  const client = useRef("");
  useEffect(() => {
    client.current = clientId();
    // The browser's id goes in a header, never a URL, so it stays out of request logs.
    fetch(`/api/reactions/${slug}/`, { headers: client.current ? { "x-client": client.current } : {} })
      .then((r) => (r.ok ? r.json() : { counts: {}, mine: [], unavailable: true }))
      .then((d) => setData({ ...d, loaded: true }))
      .catch(() => setData({ counts: {}, mine: [], unavailable: true, loaded: true }));
  }, [slug]);
  const toggle = async (kind: Kind) => {
    if (!client.current || data.unavailable || !data.loaded || busy) return;
    // optimistic, then reconcile with the server's answer; roll back if it never comes
    const before = data;
    setData((d) => {
      const has = d.mine.includes(kind);
      return { ...d, mine: has ? d.mine.filter((k) => k !== kind) : [...d.mine, kind], counts: { ...d.counts, [kind]: Math.max(0, (d.counts[kind] || 0) + (has ? -1 : 1)) } };
    });
    setBusy(true);
    try {
      const res = await fetch(`/api/reactions/${slug}/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: client.current, kind }) });
      if (res.ok) {
        const next = await res.json();
        setData({ ...next, loaded: true });
        track("reaction", { post: slug, kind, on: (next.mine as string[]).includes(kind), floating });
      } else setData(before);
    } catch { setData(before); } finally { setBusy(false); }
  };
  if (data.unavailable) return null; // no backend on this host: nothing to press, so show nothing
  const n = REACTIONS.reduce((a, r) => a + (data.counts[r.id] || 0), 0);
  const chips = REACTIONS.map((r) => (
    <Chip key={r.id} r={r} count={data.counts[r.id] || 0} mine={data.mine.includes(r.id)} onToggle={toggle} reduced={reduced} floating={floating} tight={floating && tiny} busy={busy || !data.loaded} onHint={setHint} />
  ));
  const caption = <span aria-live="polite" style={{ fontSize: "var(--text-sm)", color: hint ? "var(--text-2)" : "var(--text-3)", whiteSpace: "nowrap", minWidth: 0 }}>{hint || (n > 0 ? `${n} ${n === 1 ? "reaction" : "reactions"}` : "Anonymous, no account")}</span>;
  return (
    <div ref={anchor} style={{ minHeight: 44 }}>
      {!floating ? (
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "48px minmax(0,1fr)", columnGap: "var(--space-4)", rowGap: 8, alignItems: "center" }}>
          <span style={LABEL}>React</span>
          <div role="group" aria-label="Reactions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>{chips}<span style={{ marginLeft: 6 }}>{caption}</span></div>
        </div>
      ) : (
        <div role="group" aria-label="Reactions" className="reactions-pill" style={{ padding: tiny ? "6px 6px 6px 8px" : "6px 6px 6px 18px", animation: reduced ? undefined : "ma-pill-rise 420ms var(--ease-settle)" }}>
          {!tiny && <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-md)", fontWeight: 500, color: hint ? "var(--text)" : "var(--text-2)", marginRight: 8, whiteSpace: "nowrap", minWidth: 132, flex: "none" }}>{hint || "Leave a mark"}</span>}
          {chips}
          <button type="button" aria-label="Hide reactions" onClick={() => setDismissed(true)} className="reactions-pill__close">×</button>
        </div>
      )}
    </div>
  );
}
