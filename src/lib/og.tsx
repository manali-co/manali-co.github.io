import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { projectLabel } from "./site";
import { AGENT_PALETTES, markDots } from "./agent-mark";

/* Social cards: 1200x630, brand ground, project dot, title in Comfortaa, byline, the mark.
   Shared by the site card and every post's card. */
export const OG_SIZE = { width: 1200, height: 630 };

const DOTS: Record<string, string> = { yapp: "#E8B79A", "what-should-we-watch": "#EE8079", spark: "#E03C7A", portfolio: "#D2491F", manali: "#5B63C7" };

async function font(file: string) {
  return readFile(path.join(process.cwd(), "src", "assets", "fonts", file));
}

/* series: the design system's series card (SocialCard kind="series"): a gold "Series" kicker with
   the part count, and the progress line bottom-right, filled for parts out, dashed for coming. */
/* agent: the post was written by that project's agent; its dot-mark tile sits before the byline. */
export async function ogImage({ title, kicker, byline, project = "manali", dark = true, series, agent }: {
  title: string; kicker?: string; byline?: string; project?: string; dark?: boolean; series?: { soon: boolean }[]; agent?: string;
}) {
  const [comfortaa, inter] = await Promise.all([font("Comfortaa-Medium.ttf"), font("Inter-Regular.ttf")]);
  const ground = dark ? "#0C0C12" : "#F7F5EE";
  const ink = dark ? "#F7F5EE" : "#23224A";
  const muted = dark ? "#B9B8D3" : "#55547A";
  const ridge = dark ? "#FFFFFF" : "#2C2B6B";
  const size = title.length > 60 ? 56 : title.length > 36 ? 66 : 80;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: ground, color: ink, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {series ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, color: muted, letterSpacing: 2, textTransform: "uppercase" }}>
              <span style={{ color: dark ? "#F2B84B" : "#5B63C7" }}>Series</span>
              <span>· {series.filter((p) => !p.soon).length} {series.filter((p) => !p.soon).length === 1 ? "part" : "parts"} so far</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: DOTS[project] || DOTS.manali }} />
              {kicker || projectLabel[project] || "manali apps"}
            </div>
          )}
          <svg viewBox="0 0 100 100" width="96" height="96">
            <circle cx="68" cy="40" r="19" fill="none" stroke={dark ? "rgba(242,184,75,0.35)" : "#FBE7B8"} strokeWidth="1.5" />
            <circle cx="68" cy="40" r="13" fill="#F2B84B" />
            <path d="M6 70 C 18 70, 24 28, 36 28 C 48 28, 50 62, 60 62 C 72 62, 76 46, 94 46" fill="none" stroke={ridge} strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontFamily: "Comfortaa", fontSize: size, lineHeight: 1.1, letterSpacing: -1, maxWidth: 1000, display: "flex" }}>{title}</div>
          {byline && (
            <div style={{ fontSize: 28, color: muted, display: "flex", alignItems: "center", gap: 16 }}>
              {agent && (() => {
                const pal = AGENT_PALETTES[agent] || AGENT_PALETTES.manali;
                return (
                  <svg viewBox="0 0 100 100" width="56" height="56">
                    <rect x="0" y="0" width="100" height="100" rx="26" fill={pal.ground} />
                    {pal.light && <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="25.5" fill="none" stroke="rgba(35,34,74,0.14)" strokeWidth="1.5" />}
                    {markDots(56).map((c) => <circle key={`${c.i}-${c.j}`} cx={c.cx} cy={c.cy} r={c.r} fill={c.kind === "sun" ? pal.sun : c.kind === "ridge" ? pal.ridge : pal.idle} />)}
                  </svg>
                );
              })()}
              {byline}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontFamily: "Comfortaa", fontSize: 34 }}>
            <span>manali</span><span style={{ color: dark ? "#F2B84B" : "#5B63C7" }}>apps</span>
          </div>
          {series && series.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", width: Math.min(460, series.length * 110), marginBottom: 6 }}>
              {series.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flexGrow: i === 0 ? 0 : 1 }}>
                  {i > 0 && <div style={{ flexGrow: 1, height: 0, borderTop: `3px ${p.soon ? "dashed" : "solid"} ${!p.soon && !series[i - 1].soon ? (dark ? "#9AA0EA" : "#5B63C7") : "rgba(247,245,238,0.2)"}` }} />}
                  <div style={{ width: 16, height: 16, borderRadius: 8, ...(p.soon ? { border: `2px dashed ${muted}` } : { background: dark ? "#9AA0EA" : "#5B63C7" }) }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Comfortaa", data: comfortaa, weight: 500, style: "normal" }, { name: "Inter", data: inter, weight: 400, style: "normal" }] }
  );
}
