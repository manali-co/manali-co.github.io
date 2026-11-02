import type { CSSProperties } from "react";
import type { Avatar } from "@/lib/wsww-link";

/* DiscAvatar ("Disco"): a person is one disc, a mood hue, a blob shape and a small face. A static
   port of the app design system's components/brand/DiscAvatar.jsx (no live pulse or blink: the web
   page only ever shows the sender's). Colours come from the page's scoped --mood-* tokens. */

const SHAPES: Record<Avatar["shape"], { r: string; sx: number; sy: number; rotate: number }> = {
  round: { r: "50%", sx: 1, sy: 1, rotate: 0 },
  pebble: { r: "58% 42% 50% 50% / 50% 58% 42% 50%", sx: 1.04, sy: 0.96, rotate: -8 },
  drop: { r: "50% 50% 46% 54% / 62% 62% 38% 38%", sx: 0.94, sy: 1.08, rotate: 0 },
  bean: { r: "46% 54% 48% 52% / 54% 46% 54% 46%", sx: 1.1, sy: 0.9, rotate: 12 },
  tall: { r: "50% 50% 46% 46% / 60% 60% 40% 40%", sx: 0.88, sy: 1.14, rotate: 0 },
  squish: { r: "50% 50% 42% 42% / 62% 62% 38% 38%", sx: 1.14, sy: 0.84, rotate: 0 },
};
type Face = { eyes: string; mouth: string; eyeScale?: number; mouthX?: number; eyesY?: number };
const FACES: Record<Avatar["face"], Face> = {
  smile: { eyes: "dot", mouth: "smile" },
  grin: { eyes: "arc", mouth: "grin" },
  calm: { eyes: "line", mouth: "smile" },
  wink: { eyes: "wink", mouth: "smile" },
  curious: { eyes: "dot", mouth: "o", eyeScale: 1.25 },
  thinking: { eyes: "look", mouth: "line", mouthX: 18 },
  sleepy: { eyes: "line", mouth: "line", eyesY: 12 },
  cheeky: { eyes: "dot", mouth: "smirk" },
  deadpan: { eyes: "dot", mouth: "line" },
  starry: { eyes: "big", mouth: "grin" },
};
// The design's fallback when nobody has picked: round · smile.
const FALLBACK: Avatar = { hue: "coral", shape: "round", face: "smile" };

export function DiscAvatar({ avatar, size, label }: { avatar: Avatar | null; size: number; label: string }) {
  const { hue, shape, face, duo } = avatar ?? FALLBACK;
  const sh = SHAPES[shape];
  const f = FACES[face];
  const eye = size * 0.11, gap = size * 0.2, stroke = Math.max(1.5, size * 0.03);
  const ink = "var(--mood-on-fill)";
  const lid: CSSProperties = { height: eye * 0.5, background: "transparent", borderBottom: `${stroke}px solid ${ink}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%", boxSizing: "border-box" };
  const eyeStyle = (i: number): CSSProperties => {
    const base: CSSProperties = { width: eye, height: eye, borderRadius: "50%", background: ink, display: "block", transform: `scale(${f.eyeScale || 1})` };
    if (f.eyes === "arc") return { ...base, height: eye * 0.6, borderRadius: "60% 60% 40% 40%" };
    if (f.eyes === "line" || (f.eyes === "wink" && i === 1)) return { ...base, ...lid };
    if (f.eyes === "look") return { ...base, transform: "translate(22%, -22%) scale(.9)" };
    if (f.eyes === "big") return { ...base, transform: "scale(1.4)" };
    return base;
  };
  const mw = size * 0.22, mh = size * 0.12;
  const mouths: Record<string, CSSProperties> = {
    smile: { width: mw, height: mh, borderBottom: `${stroke}px solid ${ink}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%" },
    grin: { width: mw, height: mh * 1.2, background: ink, borderRadius: "0 0 50% 50% / 0 0 100% 100%" },
    line: { width: mw * 0.8, height: 0, borderTop: `${stroke}px solid ${ink}`, borderRadius: 99 },
    o: { width: mh, height: mh, border: `${stroke}px solid ${ink}`, borderRadius: "50%" },
    smirk: { width: mw * 0.7, height: mh, borderBottom: `${stroke}px solid ${ink}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%", transform: "translateX(20%) rotate(-10deg)" },
  };
  const shift = duo ? size * 0.14 : 0;
  return (
    <span role="img" aria-label={label} style={{ position: "relative", display: "inline-flex", width: size, height: size, flex: "none", isolation: "isolate", borderRadius: 99 }}>
      {duo && <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `var(--mood-${duo})`, transform: "translateX(-22%) scale(.92)", mixBlendMode: "var(--mood-blend-mode)" as CSSProperties["mixBlendMode"] }} />}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: sh.r, background: `var(--mood-${hue})`, transform: `${duo ? "translateX(14%) " : ""}rotate(${sh.rotate}deg) scale(${sh.sx}, ${sh.sy})`, mixBlendMode: (duo ? "var(--mood-blend-mode)" : "normal") as CSSProperties["mixBlendMode"] }} />
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: `${50 + (f.eyesY || 0) * 0.3}%`, width: gap + eye, height: eye, marginLeft: -(gap + eye) / 2 + shift, marginTop: -eye / 2 - size * 0.04, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={eyeStyle(0)} />
        <span style={eyeStyle(1)} />
      </span>
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "66%", transform: `translateX(calc(-50% + ${(f.mouthX || 0) * 0.01 * size}px + ${shift}px))`, ...mouths[f.mouth], boxSizing: "border-box" }} />
    </span>
  );
}
