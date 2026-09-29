import { Fragment, type CSSProperties } from "react";
import type { PartState } from "./state";

/* Ported from the design system (components/series/SeriesTrack.jsx). One line through the parts,
   like the mark: read parts are filled indigo, the part being read is the sun with its halo,
   unread parts are hollow, coming-soon parts are dashed. */
const DIM = { sm: [8, 16, 2, 3], md: [10, 22, 2, 3], lg: [16, 44, 3, 6] } as const;

export function SeriesTrack({ parts, size = "md", fill = false, label, style }: { parts: { state: PartState }[]; size?: keyof typeof DIM; fill?: boolean; label?: string; style?: CSSProperties }) {
  const [d, seg, line, halo] = DIM[size];
  const lit = (s: PartState) => s === "read" || s === "current";
  const cur = parts.findIndex((p) => p.state === "current");
  const aria = label || `${cur >= 0 ? `Part ${cur + 1} of ${parts.length}` : `${parts.length} parts`}, ${parts.filter((p) => p.state === "read").length} read`;
  return (
    <span role="img" aria-label={aria} style={{ display: "flex", alignItems: "center", width: fill ? "100%" : "auto", padding: `${halo}px`, boxSizing: "border-box", ...style }}>
      {parts.map((p, i) => {
        const cd = p.state === "current" ? d + Math.round(d * 0.4) : d;
        const dot: CSSProperties = p.state === "current" ? { background: "var(--sun)", boxShadow: `0 0 0 ${halo}px var(--sun-tint)` }
          : p.state === "read" ? { background: "var(--accent)" }
          : p.state === "soon" ? { border: "1.5px dashed var(--text-3)" }
          : { border: "1.5px solid var(--border-strong)", background: "var(--bg)" };
        return (
          <Fragment key={i}>
            {i > 0 && <span aria-hidden="true" style={{ flex: fill ? `1 1 ${seg}px` : `0 0 ${seg}px`, minWidth: 6, height: 0, borderTop: `${line}px ${p.state === "soon" ? "dashed" : "solid"} ${lit(p.state) && lit(parts[i - 1].state) ? "var(--accent)" : "var(--border-strong)"}` }} />}
            <span aria-hidden="true" style={{ width: cd, height: cd, borderRadius: "50%", flex: "none", boxSizing: "border-box", ...dot }} />
          </Fragment>
        );
      })}
    </span>
  );
}
