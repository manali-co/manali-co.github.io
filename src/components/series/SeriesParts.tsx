"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { SeriesView } from "@/lib/series";
import { Icon } from "../Icon";
import { seriesState, useSeriesRead, type ReaderPart } from "./state";

/* Ported from the design system (components/series/SeriesParts.jsx). Every part with the reader's
   state, one line running through the markers. variant "list" (end of post on phones), "rail"
   (sticky side rail on laptops), "hub" (series landing page, with summaries). */
type Variant = "list" | "rail" | "hub";
const LABEL: Partial<Record<ReaderPart["state"], string>> = { read: "Read", current: "You are here", soon: "Coming soon" };

function Marker({ p, sz }: { p: ReaderPart; sz: number }) {
  const base: CSSProperties = { width: sz, height: sz, borderRadius: "50%", boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: sz > 24 ? 13 : 11, fontWeight: 500, position: "relative", zIndex: 1, flex: "none" };
  if (p.state === "read") return <span aria-hidden="true" style={{ ...base, background: "var(--accent)", color: "var(--accent-fg)" }}><Icon name="check" size={Math.round(sz * 0.5)} /></span>;
  if (p.state === "current") return <span aria-hidden="true" style={{ ...base, background: "var(--sun)", color: "#23224A", boxShadow: "0 0 0 4px var(--sun-tint)" }}>{p.n}</span>;
  if (p.state === "soon") return <span aria-hidden="true" style={{ ...base, background: "var(--bg)", border: "1.5px dashed var(--text-3)", color: "var(--text-3)" }}>{p.n}</span>;
  return <span aria-hidden="true" style={{ ...base, background: "var(--bg)", border: "1.5px solid var(--border-strong)", color: "var(--text-2)" }}>{p.n}</span>;
}

function Row({ p, next, last, variant }: { p: ReaderPart; next?: ReaderPart; last: boolean; variant: Variant }) {
  const rail = variant === "rail", hub = variant === "hub";
  const sz = rail ? 22 : 28;
  const link = p.state !== "soon" && p.state !== "current" && p.href;
  const lit = (s?: string) => s === "read" || s === "current";
  const titleStyle: CSSProperties = { fontFamily: hub ? "var(--font-display)" : "var(--font-body)", fontWeight: hub ? 500 : p.state === "current" ? 600 : 500, fontSize: hub ? "var(--text-h3)" : rail ? "var(--text-sm)" : "var(--text-md)", lineHeight: 1.35, color: p.state === "soon" ? "var(--text-3)" : undefined, textDecoration: "none", textWrap: "pretty" };
  return (
    <li aria-current={p.state === "current" ? "step" : undefined} style={{ position: "relative", display: "grid", gridTemplateColumns: `${sz}px minmax(0,1fr)`, columnGap: rail ? 10 : 14, paddingBottom: last ? 0 : hub ? "var(--space-6)" : rail ? 14 : "var(--space-5)" }}>
      {!last && <span aria-hidden="true" style={{ position: "absolute", left: sz / 2 - 1, top: sz / 2, bottom: -sz / 2, width: 0, borderLeft: `2px ${next?.state === "soon" ? "dashed" : "solid"} ${lit(p.state) && lit(next?.state) ? "var(--accent)" : "var(--border-strong)"}` }} />}
      <Marker p={p} sz={sz} />
      <div style={{ display: "grid", gap: rail ? 2 : 4, minWidth: 0, paddingTop: rail ? 2 : 4 }}>
        <span className="series-mono series-mono--muted" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: rail ? 11 : undefined }}>
          <span>Part {p.n}</span>
          {LABEL[p.state] && <span style={{ color: p.state === "current" ? "var(--sun)" : undefined }}>{LABEL[p.state]}</span>}
        </span>
        {link ? <Link href={p.href!} className="series-link" style={titleStyle}>{p.title}</Link> : <span style={{ ...titleStyle, color: p.state === "soon" ? "var(--text-3)" : "var(--text)" }}>{p.title}</span>}
        {hub && p.summary && <p style={{ margin: 0, fontSize: "var(--text-md)", lineHeight: "var(--lh-body)", color: "var(--text-2)", maxWidth: "56ch" }}>{p.summary}</p>}
        {!rail && (p.date || p.readTime) && <span className="series-small series-small--muted">{[p.date, p.readTime].filter(Boolean).join(" · ")}</span>}
      </div>
    </li>
  );
}

export function SeriesParts({ series, current, variant = "list", heading = true, className }: { series: SeriesView; current?: string; variant?: Variant; heading?: boolean; className?: string }) {
  const read = useSeriesRead();
  const s = seriesState(series, current, read);
  const rail = variant === "rail";
  return (
    <section aria-label={`Parts of ${series.name}`} className={className} style={{ display: "grid", gap: rail ? "var(--space-4)" : "var(--space-5)" }}>
      {heading && (
        <div style={{ display: "grid", gap: 4 }}>
          <span className="series-mono" style={{ fontSize: rail ? 11 : undefined, color: "var(--sun)" }}>Series</span>
          <Link href={series.href} className="series-link" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: rail ? "var(--text-md)" : "var(--text-h3)", lineHeight: 1.3, textDecoration: "none", textWrap: "balance" }}>{series.name}</Link>
          <span className="series-small series-small--muted">{s.readCount > 0 ? `You've read ${s.readCount} of ${s.published.length}` : `${s.published.length} ${s.published.length === 1 ? "part" : "parts"} so far`}{s.soonCount ? ` · ${s.soonCount} coming` : ""}</span>
        </div>
      )}
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid" }}>
        {s.parts.map((p, i) => <Row key={p.n} p={p} next={s.parts[i + 1]} last={i === s.parts.length - 1} variant={variant} />)}
      </ol>
    </section>
  );
}
