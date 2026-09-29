"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { SeriesView } from "@/lib/series";
import { Icon } from "../Icon";
import { track } from "../Telemetry";
import { SeriesTrack } from "./SeriesTrack";
import { SeriesParts } from "./SeriesParts";
import { SeriesFollow } from "./SeriesFollow";
import { markSeriesRead, seriesState, useSeriesRead } from "./state";

/* Ported from the design system (components/series/SeriesNext.jsx). End of a series post, straight
   after the prose. Next part published: its title, summary and a Read button. Not written yet:
   coming soon, and follow this series by email. Complete: that's the whole series. The parts
   list shows here on phones; laptops have the rail. Reaching this block marks the post read. */
export function SeriesNext({ series, current, rail }: { series: SeriesView; current: string; rail: boolean }) {
  const stored = useSeriesRead();
  const read = stored.includes(current) ? stored : [...stored, current];
  const s = seriesState(series, current, read);
  const next = s.next;
  const readNow = s.published.filter((p) => p.slug && read.includes(p.slug)).length;
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { markSeriesRead(current); track("series_part_read", { series: series.slug, page: current }); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [current, series.slug]);
  const trackParts = s.parts.map((p) => (p.slug === current ? { ...p, state: "current" as const } : p));
  return (
    <section ref={box} id="series-end" aria-label={`Next in ${series.name}`} className="series-next">
      <div className="series-row">
        <span className="series-mono" style={{ color: "var(--sun)" }}>{next ? "Next in the series" : series.complete ? "End of the series" : "You're caught up"}</span>
        <SeriesTrack parts={trackParts} size="sm" />
      </div>
      {next && !next.soon && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <span className="series-mono series-mono--muted">Part {next.n} of {s.total}</span>
          <h2 className="series-next__title"><Link href={next.href!} className="series-link">{next.title}</Link></h2>
          {next.summary && <p className="series-next__summary">{next.summary}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
            <Link className="button button--primary" href={next.href!}>Read part {next.n}<Icon name="arrow-right" size={16} /></Link>
            <span className="series-small series-small--muted">You&apos;ve read {readNow} of {s.published.length}{next.readTime ? ` · ${next.readTime}` : ""}</span>
          </div>
        </div>
      )}
      {next && next.soon && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span className="series-mono series-mono--muted">Part {next.n}</span><span className="series-soon">Coming soon</span></span>
          <h2 className="series-next__title" style={{ color: "var(--text-2)" }}>{next.title}</h2>
          <p className="series-small series-small--muted">You&apos;ve read {readNow} of {s.published.length} so far.</p>
        </div>
      )}
      {!next && (
        <div style={{ display: "grid", gap: "var(--space-2)" }}>
          <h2 className="series-next__title">{series.complete ? "That's the whole series." : "That's every part so far."}</h2>
          <p className="series-small series-small--muted">You&apos;ve read {readNow} of {s.published.length}.</p>
        </div>
      )}
      {(!next || next.soon) && !series.complete && <div className="series-next__band"><SeriesFollow compact series={series.slug} seriesName={series.name} /></div>}
      <div className={`series-next__band ${rail ? "series-next__parts--rail" : ""}`}><SeriesParts series={series} current={current} heading={false} /></div>
      <Link href={series.href} className="series-next__hub">All parts of {series.name}<Icon name="arrow-right" size={14} /></Link>
    </section>
  );
}
