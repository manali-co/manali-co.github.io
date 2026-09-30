"use client";
import Link from "next/link";
import type { SeriesView } from "@/lib/series";
import { Icon } from "../Icon";
import { SeriesTrack } from "./SeriesTrack";
import { seriesState, useSeriesRead } from "./state";

/* Ported from the design system (components/series/SeriesMarker.jsx). Near the top of a series
   post: series name (to the hub), Part N of M, the progress line. A reader who landed past
   Part 1 without reading it is offered Part 1. */
export function SeriesMarker({ series, current }: { series: SeriesView; current: string }) {
  const read = useSeriesRead();
  const s = seriesState(series, current, read);
  const cur = s.currentPart;
  const first = s.parts[0];
  const offerStart = cur && cur.n > 1 && first && first.state === "unread" && first.href;
  return (
    <nav aria-label="Series" className="series-marker">
      <div className="series-row">
        <span className="series-mono series-mono--muted"><span style={{ color: "var(--sun)" }}>Series</span>{cur ? ` · Part ${cur.n} of ${s.total}` : ""}</span>
        <SeriesTrack parts={s.parts} size="sm" />
      </div>
      <Link href={series.href} className="series-marker__name series-link">{series.name}<span className="series-nudge"><Icon name="arrow-right" size={16} /></span></Link>
      {offerStart && <p className="series-small">New here? <Link href={first.href!} style={{ fontWeight: 500 }}>Start with Part 1</Link></p>}
    </nav>
  );
}
