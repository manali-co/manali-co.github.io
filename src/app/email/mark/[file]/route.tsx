import { ImageResponse } from "next/og";
import { FACES, HUES, SHAPES, type Mark } from "@/components/DiscoMark";

/* A waitlist member's Disco mark as a PNG for the "You're in" email (/email/mark/lagoon-drop-smile@2x.png).
   Mail apps (Gmail's especially) force-invert colours in dark mode, which turned the graphite face
   white when the mark was drawn with table cells; an image is never inverted. Same geometry as the
   page's DiscoMark, every combination rendered at build time. 144px, shown at 72. */
const SIZE = 144;
const INK = "#17181B";
const HEX: Record<string, string> = { coral: "#E8796F", lilac: "#AE9BE0", lagoon: "#4DBFB0", butter: "#E6C76E", moss: "#8FBF8A", sky: "#6FA8DC" };

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return HUES.flatMap((h) => Object.keys(SHAPES).flatMap((s) => Object.keys(FACES).map((f) => ({ file: `${h}-${s}-${f}@2x.png` }))));
}

function parse(file: string): Mark {
  const [hue, shape, face] = decodeURIComponent(file).replace(/@2x\.png$/, "").split("-");
  return { hue: hue as Mark["hue"], shape: shape as Mark["shape"], face: face as Mark["face"] };
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { hue, shape, face } = parse((await params).file);
  const sh = SHAPES[shape] || SHAPES.round;
  const f = FACES[face] || FACES.smile;
  // The body is drawn in a smaller box so shapes stretched past a square (tall, drop, squish)
  // and rotated ones stay inside the image; on the page they simply overflow.
  const PAD = SIZE * 0.1, size = SIZE - 2 * PAD;
  const eye = size * 0.11, gap = size * 0.2, stroke = Math.max(1.5, size * 0.03);
  const eyeStyle = (i: number): React.CSSProperties => {
    const b: React.CSSProperties = { width: eye, height: eye, borderRadius: "50%", background: INK, display: "flex", transform: `scale(${f.eyeScale || 1})` };
    const lid: React.CSSProperties = { height: eye * 0.5, background: "transparent", borderBottom: `${stroke}px solid ${INK}`, borderRadius: `0 0 ${eye / 2}px ${eye / 2}px` };
    if (f.eyes === "arc") return { ...b, height: eye * 0.6, borderRadius: `${eye * 0.6}px ${eye * 0.6}px ${eye * 0.4}px ${eye * 0.4}px` };
    if (f.eyes === "line" || (f.eyes === "wink" && i === 1)) return { ...b, ...lid };
    if (f.eyes === "look") return { ...b, transform: "translate(3px, -3px) scale(.9)" };
    if (f.eyes === "big") return { ...b, transform: "scale(1.4)" };
    return b;
  };
  const mw = size * 0.22, mh = size * 0.12;
  const mouths: Record<string, React.CSSProperties> = {
    smile: { width: mw, height: mh, borderBottom: `${stroke}px solid ${INK}`, borderRadius: `0 0 ${mw / 2}px ${mw / 2}px` },
    grin: { width: mw, height: mh * 1.2, background: INK, borderRadius: `0 0 ${mw / 2}px ${mw / 2}px` },
    line: { width: mw * 0.8, height: stroke, background: INK, borderRadius: 99 },
    o: { width: mh, height: mh, border: `${stroke}px solid ${INK}`, borderRadius: "50%" },
    smirk: { width: mw * 0.7, height: mh, borderBottom: `${stroke}px solid ${INK}`, borderRadius: `0 0 ${mw / 2}px ${mw / 2}px`, transform: "translateX(20%) rotate(-10deg)" },
  };
  return new ImageResponse(
    (
      <div style={{ width: SIZE, height: SIZE, display: "flex", position: "relative", background: "transparent" }}>
        <div style={{ position: "absolute", left: PAD, top: PAD, width: size, height: size, display: "flex" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: sh.r, background: HEX[hue] || HEX.coral, transform: `rotate(${sh.rot}deg) scale(${sh.sx}, ${sh.sy})` }} />
        <div style={{ position: "absolute", left: (size - gap - eye) / 2, top: size * (0.5 + (f.eyesY || 0) * 0.003) - eye / 2 - size * 0.04, width: gap + eye, height: eye, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={eyeStyle(0)} /><div style={eyeStyle(1)} />
        </div>
        <div style={{ position: "absolute", left: 0, top: size * 0.66, width: size, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", ...mouths[f.mouth], boxSizing: "border-box", marginLeft: (f.mouthX || 0) * 0.02 * size }} />
        </div>
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE, headers: { "cache-control": "public, max-age=31536000, immutable" } },
  );
}
