"use client";
import { useEffect, useRef, useState } from "react";

/* Reactions that leave a mark, from the design's ReactionBar v2. Tap: the chip pops (420ms),
   a tint ripple expands and fades (700ms), six sparks fly out with a 30ms stagger (560ms),
   the count slides up (320ms) and the chip settles into its reacted state: tint fill, 1.5px
   accent border, bold count, filled glyph, a corner dot. Reduced motion: state change only.
   Storage is the site's own API; each browser gets a random id, nothing personal. */

const GLYPHS: Record<string, string> = {
  "thumbs-up": "M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
  heart: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  eyes: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7ZM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z",
  laugh: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12ZM9 9h.01M15 9h.01",
};
const ORDER = ["thumbs-up", "heart", "rocket", "eyes", "laugh", "sun"] as const;
const LABELS: Record<string, string> = { "thumbs-up": "Thumbs up", heart: "Heart", rocket: "Rocket", eyes: "Eyes", laugh: "Laugh", sun: "Sunrise" };
const SPARKS = [[-14, -18], [10, -20], [18, -6], [-18, 2], [6, 16], [-6, 18]];
type Kind = (typeof ORDER)[number];
type Data = { counts: Record<string, number>; mine: string[]; unavailable?: boolean };

function clientId() {
  try {
    let id = localStorage.getItem("ma-client");
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("ma-client", id); }
    return id;
  } catch { return ""; }
}

function Chip({ id, count, mine, onToggle, reduced, busy }: { id: Kind; count: number; mine: boolean; onToggle: (k: Kind) => void; reduced: boolean; busy: boolean }) {
  const [burst, setBurst] = useState(0);
  const [fresh, setFresh] = useState(false);
  const timer = useRef<number | null>(null);
  const sun = id === "sun";
  const zero = !count;
  const fire = () => {
    if (busy) return;
    if (!mine && !reduced) {
      setBurst((b) => b + 1); setFresh(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFresh(false), 900);
    }
    onToggle(id);
  };
  const live = sun && (mine || count > 0);
  return (
    <button type="button" className={`react ${mine ? "react--mine" : ""} ${sun ? "react--sun" : ""} ${fresh ? "react--fresh" : ""}`} onClick={fire} aria-pressed={mine} aria-label={`${LABELS[id]}${count ? `, ${count}` : ""}${mine ? ", you reacted" : ""}`} title={LABELS[id]}>
      {fresh && !reduced && (
        <span className="react__burst" aria-hidden="true" key={burst}>
          <span className="react__ripple" />
          {SPARKS.map(([dx, dy], i) => <span key={i} className="react__spark" style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, animationDelay: `${i * 30}ms` }} />)}
        </span>
      )}
      {sun ? (
        <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" style={{ overflow: "visible" }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="#FBE7B8" strokeWidth="1.5" style={{ opacity: live ? 1 : 0, transition: "opacity var(--dur-base) var(--ease-out)" }} />
          <circle className="react__sun" cx="12" cy="12" r="6" fill={live ? "#F2B84B" : "none"} stroke={live ? "none" : "currentColor"} strokeWidth="1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={16} height={16} fill={mine ? "currentColor" : "none"} fillOpacity={mine ? 0.18 : 0} stroke="currentColor" strokeWidth={mine ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transition: "fill-opacity var(--dur-base) var(--ease-out), stroke-width var(--dur-base) var(--ease-out)" }}><path d={GLYPHS[id]} /></svg>
      )}
      {!zero && <span className="react__count" key={count}>{count}</span>}
      {mine && <span className="react__dot" aria-hidden="true" />}
    </button>
  );
}

export function ReactionBar({ slug }: { slug: string }) {
  const [data, setData] = useState<Data>({ counts: {}, mine: [] });
  const [busy, setBusy] = useState(false);
  const [reduced, setReduced] = useState(false);
  const client = useRef("");
  useEffect(() => {
    client.current = clientId();
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setReduced(q.matches); f(); q.addEventListener("change", f);
    fetch(`/api/reactions/${slug}?client=${encodeURIComponent(client.current)}`)
      .then((r) => (r.ok ? r.json() : { counts: {}, mine: [], unavailable: true }))
      .then(setData)
      .catch(() => setData({ counts: {}, mine: [], unavailable: true }));
    return () => q.removeEventListener("change", f);
  }, [slug]);
  const toggle = async (kind: Kind) => {
    if (!client.current || data.unavailable) return;
    // optimistic, then reconcile with the server's answer
    setData((d) => {
      const mine = d.mine.includes(kind) ? d.mine.filter((k) => k !== kind) : [...d.mine, kind];
      const counts = { ...d.counts, [kind]: (d.counts[kind] || 0) + (d.mine.includes(kind) ? -1 : 1) };
      return { ...d, counts, mine };
    });
    setBusy(true);
    try {
      const res = await fetch(`/api/reactions/${slug}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: client.current, kind }) });
      if (res.ok) setData(await res.json());
    } catch {} finally { setBusy(false); }
  };
  const total = ORDER.reduce((a, k) => a + (data.counts[k] || 0), 0);
  return (
    <div className="reactions" role="group" aria-label="Reactions">
      {ORDER.map((k) => <Chip key={k} id={k} count={data.counts[k] || 0} mine={data.mine.includes(k)} onToggle={toggle} reduced={reduced} busy={busy} />)}
      {total > 0 && <span className="reactions__total">{total} {total === 1 ? "reaction" : "reactions"}</span>}
      {data.unavailable && <span className="reactions__total">Reactions switch on once the backend is up.</span>}
    </div>
  );
}
