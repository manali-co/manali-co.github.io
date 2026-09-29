"use client";
import Link from "next/link";
import type { SeriesView } from "@/lib/series";
import { Icon } from "../Icon";
import { SeriesTrack } from "./SeriesTrack";
import { seriesState, useSeriesRead } from "./state";

/* Ported from the design system (components/series/SeriesCard.jsx and SeriesShelf.jsx). A card per
   series that knows the reader: not started, Start with Part 1; part-way, "Pick up where you left
   off" and Pick up at Part N; all read, caught up. Series the reader is part-way through come
   first. One series renders wide with its parts beside the pitch; more become a grid. */
function SeriesCard({ series, read, wide }: { series: SeriesView; read: string[]; wide: boolean }) {
  const s = seriesState(series, undefined, read);
  const target = s.mode === "resume" ? s.resume : s.mode === "start" ? s.first : s.latest;
  const count = `${s.published.length} ${s.published.length === 1 ? "part" : "parts"}${s.soonCount ? `, ${s.soonCount} coming` : ""}`;
  return (
    <article className={`series-card ${wide ? "series-card--wide" : ""}`}>
      <div style={{ display: "grid", gap: "var(--space-3)", alignContent: "start", minWidth: 0 }}>
        <span className="series-mono series-mono--muted"><span style={{ color: "var(--sun)" }}>{s.mode === "resume" ? "Pick up where you left off" : "Series"}</span>{s.mode === "resume" ? "" : ` · ${count}`}</span>
        <h3 style={{ margin: 0, fontSize: wide ? "var(--text-h2)" : "var(--text-h3)", lineHeight: 1.2 }}><Link href={series.href} className="series-link" style={{ textDecoration: "none" }}>{series.name}</Link></h3>
        {series.summary && <p style={{ margin: 0, fontSize: "var(--text-md)", lineHeight: "var(--lh-body)", color: "var(--text-2)", maxWidth: "48ch" }}>{series.summary}</p>}
        <SeriesTrack parts={s.parts} size="md" style={{ marginTop: 4 }} />
        <div className="series-card__actions">
          {s.mode === "caught" || !target?.href
            ? <Link className="button button--sm" href={series.href}>All parts</Link>
            : <Link className={`button button--sm ${s.mode === "resume" ? "button--primary" : ""}`} href={target.href}>{s.mode === "resume" ? `Pick up at Part ${target.n}` : "Start with Part 1"}<Icon name="arrow-right" size={14} /></Link>}
          <span className="series-small series-small--muted">{s.mode === "start" ? (s.latest?.date ? `Latest: ${s.latest.date}` : "") : s.mode === "caught" ? "You're caught up" : `You've read ${s.readCount} of ${s.published.length}`}</span>
        </div>
      </div>
      <ol className="series-card__list">
        {s.parts.map((p) => (
          <li key={p.n}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: p.state === "read" ? "var(--accent-text)" : "var(--text-3)" }}>{p.n}</span>
            {p.soon || !p.href ? <span className="series-small series-small--muted">{p.title}</span> : <Link href={p.href} className="series-card__part">{p.title}</Link>}
            <span className="series-mono" style={{ fontSize: 11, color: p.state === "read" ? "var(--accent-text)" : "var(--text-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>{p.state === "read" ? <><Icon name="check" size={12} />Read</> : p.soon ? "Soon" : ""}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function SeriesShelf({ series, title = "Series" }: { series: SeriesView[]; title?: string }) {
  const read = useSeriesRead();
  if (!series.length) return null;
  const rank = (s: SeriesView) => ({ resume: 0, start: 1, caught: 2 })[seriesState(s, undefined, read).mode];
  const sorted = [...series].sort((a, b) => rank(a) - rank(b));
  const one = sorted.length === 1;
  return (
    <section aria-label={title} className="series-shelf">
      <h2 className="series-mono series-mono--muted" style={{ fontWeight: 400, margin: 0 }}>{title}</h2>
      <div className={one ? "series-shelf__one" : "series-shelf__grid"}>
        {sorted.map((s) => <SeriesCard key={s.slug} series={s} read={read} wide={one} />)}
      </div>
    </section>
  );
}
