import type { CSSProperties } from "react";

/* A person's Disco mark from the What Should We Watch waitlist: a mood hue, a shape and a face.
   The waitlist page (WsswWaitlist) and the owner's /admin both draw it, so they always match.
   Inside the waitlist page the hues come from its scoped --mood-* tokens (dark/light aware);
   anywhere else they fall back to the app's mood colours. */

export type Hue = "coral" | "lilac" | "lagoon" | "butter" | "moss" | "sky";
export type Mark = { hue: Hue; shape: keyof typeof SHAPES; face: keyof typeof FACES };
type Face = { eyes: string; mouth: string; eyeScale?: number; mouthX?: number; eyesY?: number; lookX?: number };

export const HUES: Hue[] = ["coral", "lilac", "lagoon", "butter", "moss", "sky"];
export const SHAPES = {
  round: { r: "50%", sx: 1, sy: 1, rot: 0 },
  pebble: { r: "58% 42% 50% 50% / 50% 58% 42% 50%", sx: 1.04, sy: 0.96, rot: -8 },
  drop: { r: "50% 50% 46% 54% / 62% 62% 38% 38%", sx: 0.94, sy: 1.08, rot: 0 },
  bean: { r: "46% 54% 48% 52% / 54% 46% 54% 46%", sx: 1.1, sy: 0.9, rot: 12 },
  tall: { r: "50% 50% 46% 46% / 60% 60% 40% 40%", sx: 0.88, sy: 1.14, rot: 0 },
  squish: { r: "50% 50% 42% 42% / 62% 62% 38% 38%", sx: 1.14, sy: 0.84, rot: 0 },
};
export const FACES: Record<string, Face> = {
  smile: { eyes: "dot", mouth: "smile" }, grin: { eyes: "arc", mouth: "grin" }, calm: { eyes: "line", mouth: "smile" },
  wink: { eyes: "wink", mouth: "smile" }, curious: { eyes: "dot", mouth: "o", eyeScale: 1.25 }, thinking: { eyes: "look", mouth: "line", mouthX: 18 },
  sleepy: { eyes: "line", mouth: "line", eyesY: 12 }, cheeky: { eyes: "dot", mouth: "smirk" }, deadpan: { eyes: "dot", mouth: "line" }, starry: { eyes: "big", mouth: "grin" },
};
const INK = "#17181B"; // faces are always graphite on single discs
const MORPH = "520ms cubic-bezier(.2,1,.3,1)";
// excited: round eyes glancing toward the newcomer (left), open grin. Sleepers stay asleep.
const EXCITED: Face = { eyes: "dot", mouth: "grin", lookX: -22, eyeScale: 1.15 };
const HEX: Record<Hue, string> = { coral: "#E8796F", lilac: "#AE9BE0", lagoon: "#4DBFB0", butter: "#E6C76E", moss: "#8FBF8A", sky: "#6FA8DC" };

export function DiscoMark({ mark, size, anim, react }: { mark: Mark; size: number; anim?: string; react?: boolean }) {
  const { hue, shape, face } = mark;
  const sh = SHAPES[shape] || SHAPES.round;
  const f = react && face !== "sleepy" ? EXCITED : FACES[face] || FACES.smile;
  const eye = size * 0.11, gap = size * 0.2, stroke = Math.max(1.5, size * 0.03);
  const lid: CSSProperties = { height: eye * 0.5, background: "transparent", borderBottom: `${stroke}px solid ${INK}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%", boxSizing: "border-box" };
  const eyeStyle = (i: number): CSSProperties => {
    const b: CSSProperties = { width: eye, height: eye, borderRadius: "50%", background: INK, display: "block", transform: `translateX(${f.lookX || 0}%) scale(${f.eyeScale || 1})`, transition: `height ${MORPH}, border-radius ${MORPH}, transform ${MORPH}, background ${MORPH}, border ${MORPH}` };
    if (f.eyes === "arc") return { ...b, height: eye * 0.6, borderRadius: "60% 60% 40% 40%" };
    if (f.eyes === "line" || (f.eyes === "wink" && i === 1)) return { ...b, ...lid };
    if (f.eyes === "look") return { ...b, transform: "translate(22%, -22%) scale(.9)" };
    if (f.eyes === "big") return { ...b, transform: "scale(1.4)" };
    return b;
  };
  const mw = size * 0.22, mh = size * 0.12;
  const mouths: Record<string, CSSProperties> = {
    smile: { width: mw, height: mh, borderBottom: `${stroke}px solid ${INK}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%" },
    grin: { width: mw, height: mh * 1.2, background: INK, borderRadius: "0 0 50% 50% / 0 0 100% 100%" },
    line: { width: mw * 0.8, height: 0, borderTop: `${stroke}px solid ${INK}`, borderRadius: 99 },
    o: { width: mh, height: mh, border: `${stroke}px solid ${INK}`, borderRadius: "50%" },
    smirk: { width: mw * 0.7, height: mh, borderBottom: `${stroke}px solid ${INK}`, borderRadius: "0 0 50% 50% / 0 0 100% 100%", transform: "translateX(20%) rotate(-10deg)" },
  };
  return (
    <span role="img" aria-label={`${hue} ${shape} ${face}`} style={{ position: "relative", display: "inline-flex", width: size, height: size, flex: "none", animation: anim || "none" }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: sh.r, background: `var(--mood-${hue}, ${HEX[hue] ?? HEX.coral})`, transform: `rotate(${sh.rot}deg) scale(${sh.sx}, ${sh.sy})` }} />
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: `${50 + (f.eyesY || 0) * 0.3}%`, width: gap + eye, height: eye, marginLeft: -(gap + eye) / 2, marginTop: -eye / 2 - size * 0.04, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={eyeStyle(0)} /><span style={eyeStyle(1)} />
      </span>
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "66%", transform: `translateX(calc(-50% + ${(f.mouthX || 0) * 0.01 * size}px))`, ...mouths[f.mouth], boxSizing: "border-box", transition: `all ${MORPH}` }} />
    </span>
  );
}
