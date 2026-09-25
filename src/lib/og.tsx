import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { projectLabel } from "./site";

/* Social cards: 1200x630, brand ground, project dot, title in Comfortaa, byline, the mark.
   Shared by the site card and every post's card. */
export const OG_SIZE = { width: 1200, height: 630 };

const DOTS: Record<string, string> = { yapp: "#E8B79A", "what-should-we-watch": "#EE8079", manali: "#5B63C7" };

async function font(file: string) {
  return readFile(path.join(process.cwd(), "src", "assets", "fonts", file));
}

export async function ogImage({ title, kicker, byline, project = "manali", dark = true }: {
  title: string; kicker?: string; byline?: string; project?: string; dark?: boolean;
}) {
  const [comfortaa, inter] = await Promise.all([font("Comfortaa-Medium.ttf"), font("Inter-Regular.ttf")]);
  const ground = dark ? "#16152E" : "#F7F5EE";
  const ink = dark ? "#F7F5EE" : "#23224A";
  const muted = dark ? "#B9B8D3" : "#55547A";
  const ridge = dark ? "#FFFFFF" : "#2C2B6B";
  const size = title.length > 60 ? 56 : title.length > 36 ? 66 : 80;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: ground, color: ink, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: muted, letterSpacing: 1, textTransform: "uppercase" }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: DOTS[project] || DOTS.manali }} />
            {kicker || projectLabel[project] || "manali apps"}
          </div>
          <svg viewBox="0 0 100 100" width="96" height="96">
            <circle cx="68" cy="40" r="19" fill="none" stroke={dark ? "rgba(242,184,75,0.35)" : "#FBE7B8"} strokeWidth="1.5" />
            <circle cx="68" cy="40" r="13" fill="#F2B84B" />
            <path d="M6 70 C 18 70, 24 28, 36 28 C 48 28, 50 62, 60 62 C 72 62, 76 46, 94 46" fill="none" stroke={ridge} strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontFamily: "Comfortaa", fontSize: size, lineHeight: 1.1, letterSpacing: -1, maxWidth: 1000, display: "flex" }}>{title}</div>
          {byline && <div style={{ fontSize: 28, color: muted, display: "flex" }}>{byline}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontFamily: "Comfortaa", fontSize: 34 }}>
          <span>manali</span><span style={{ color: dark ? "#F2B84B" : "#5B63C7" }}>apps</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Comfortaa", data: comfortaa, weight: 500, style: "normal" }, { name: "Inter", data: inter, weight: 400, style: "normal" }] }
  );
}
