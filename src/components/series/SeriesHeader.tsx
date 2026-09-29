"use client";
import Link from "next/link";
import type { SeriesView } from "@/lib/series";
import { Icon } from "../Icon";
import { SeriesTrack } from "./SeriesTrack";
import { seriesState, useSeriesRead } from "./state";

/* Ported from the design system (components/series/SeriesHeader.jsx). Top of /series/<slug>/:
   kicker, name, summary, counts and dates, the progress line, one reader-aware primary action,
   and Follow while the series is still going. */
/* The hub has a follow form in the side column on laptops and one under the parts on phones;
   jump to whichever is showing and put the cursor in its email field. */
function toFollow(e: React.MouseEvent) {
  const el = [...document.querySelectorAll<HTMLElement>("[data-series-follow]")].find((x) => x.offsetParent !== null);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  el.querySelector("input")?.focus({ preventScroll: true });
}

export function SeriesHeader({ series }: { series: SeriesView }) {
  const read = useSeriesRead();
  const s = seriesState(series, undefined, read);
  const target = s.mode === "resume" ? s.resume : s.mode === "start" ? s.first : s.latest;
  const label = s.mode === "resume" ? `Pick up at Part ${target?.n}` : s.mode === "start" ? "Start with Part 1" : "Read the latest part";
  const meta = [
    `${s.published.length} ${s.published.length === 1 ? "part" : "parts"} so far`,
    s.soonCount ? `${s.soonCount} coming` : null,
    s.first?.date ? `Started ${s.first.date}` : null,
    s.latest?.date && s.latest !== s.first ? `Latest ${s.latest.date}` : null,
  ].filter(Boolean);
  return (
    <header className="series-header">
      <span className="series-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--sun)" }}><Icon name="layers" size={16} />Series</span>
      <h1 style={{ fontSize: "var(--text-h1)", lineHeight: "var(--lh-tight)", margin: 0 }}>{series.name}</h1>
      {series.summary && <p style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--lh-body)", color: "var(--text-2)", maxWidth: "52ch" }}>{series.summary}</p>}
      <p className="series-small series-small--muted">{meta.join(" · ")}</p>
      <div style={{ display: "grid", gap: 8, maxWidth: 440, marginTop: "var(--space-2)" }}>
        <SeriesTrack parts={s.parts} size="lg" fill />
        {s.readCount > 0 && <span className="series-small">{s.mode === "caught" ? "You've read every part so far." : `You've read ${s.readCount} of ${s.published.length}.`}</span>}
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
        {target?.href && <Link className="button button--primary" href={target.href}>{label}<Icon name="arrow-right" size={16} /></Link>}
        {!series.complete && <a className="button" href="#follow" onClick={toFollow}><Icon name="bell" size={16} />Follow this series</a>}
      </div>
    </header>
  );
}
