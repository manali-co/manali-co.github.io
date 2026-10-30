import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { copyFor, cut, nameOf, OG_SIZE, type Disco, type Person, type Preview } from "./wsww-preview";

/* The link preview image: a 1:1 port of Claude Design's "Link preview" component (board 20).
   1200 x 630, graphite ground; everything that must be read sits in the centre 630 px square
   (x 285-915), because iMessage crops to about 1.17:1 and WhatsApp's small card to 1:1. Flex
   only. Discs are inline SVG (board 20, C "Discs": no filters, no blend modes), the dashed disc a
   stroked circle with a dash array. */

const GROUND = "#17181B";
const PAPER = "#F2F1EE";
const MUTED = "#9D9D9B";
const DASHED = "#5A5B60";
const HAIR = "#2B2C32";
// The app's mood fills (apps/mobile/src/design/data.ts).
const HUE: Record<string, string> = { coral: "#E8796F", lilac: "#AE9BE0", lagoon: "#4DBFB0", butter: "#E6C76E", moss: "#8FBF8A", sky: "#6FA8DC" };
// The app's Disco shapes as CSS corner radii (horizontal / vertical, in %; services/api launch.py).
const SHAPE: Record<string, string> = {
  round: "50% 50% 50% 50% / 50% 50% 50% 50%",
  pebble: "58% 42% 50% 50% / 50% 58% 42% 50%",
  drop: "50% 50% 46% 54% / 62% 62% 38% 38%",
  bean: "46% 54% 48% 52% / 54% 46% 54% 46%",
  tall: "50% 50% 46% 46% / 60% 60% 40% 40%",
  squish: "50% 50% 42% 42% / 62% 62% 38% 38%",
};
// The design's fallback when nobody picked a Disco: coral, round.
const FALLBACK: Disco = { hue: "coral", shape: "round" };

/** A box with CSS elliptical corner radii as one SVG path (the shape drawn once, filled). */
export function shapePath(shape: string, size: number): string {
  const [h, v] = (SHAPE[shape] || SHAPE.round).split("/").map((p) => p.trim().split(/\s+/).map((x) => (parseFloat(x) / 100) * size));
  const [tlh, trh, brh, blh] = h, [tlv, trv, brv, blv] = v;
  const s = size;
  return [
    `M ${tlh} 0`, `L ${s - trh} 0`, `A ${trh} ${trv} 0 0 1 ${s} ${trv}`,
    `L ${s} ${s - brv}`, `A ${brh} ${brv} 0 0 1 ${s - brh} ${s}`,
    `L ${blh} ${s}`, `A ${blh} ${blv} 0 0 1 0 ${s - blv}`,
    `L 0 ${tlv}`, `A ${tlh} ${tlv} 0 0 1 ${tlh} 0`, "Z",
  ].join(" ");
}

// Three lines at 42 px hold about 54 characters in the 310 px column; past that the server cuts
// the title (Satori has no line clamp that works with balanced wrapping).
const TITLE_MAX = 54;
const DISC = 168; // the component's disc
const RING = 8; // box-shadow 0 0 0 8px ground: the cut between overlapping discs
const BOX = DISC + 2 * RING;
const STEP = DISC - 36; // each disc 36 px over the one before

function Disc({ disco, first }: { disco: Disco | null; first: boolean }) {
  const d = disco || FALLBACK;
  const p = shapePath(d.shape, DISC);
  return (
    <svg width={BOX} height={BOX} viewBox={`${-RING} ${-RING} ${BOX} ${BOX}`} style={{ marginLeft: first ? 0 : STEP - BOX, flex: "none" }}>
      <path d={p} fill={GROUND} stroke={GROUND} strokeWidth={RING * 2} strokeLinejoin="round" />
      <path d={p} fill={HUE[d.hue] || HUE.coral} />
    </svg>
  );
}

function DashedDisc({ first }: { first: boolean }) {
  const c = DISC / 2;
  return (
    <div style={{ display: "flex", position: "relative", width: BOX, height: BOX, marginLeft: first ? 0 : STEP - BOX, flex: "none", alignItems: "center", justifyContent: "center" }}>
      <svg width={BOX} height={BOX} viewBox={`${-RING} ${-RING} ${BOX} ${BOX}`} style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx={c} cy={c} r={c + RING} fill={GROUND} />
        <circle cx={c} cy={c} r={c - 1.5} fill={GROUND} stroke={DASHED} strokeWidth={3} strokeDasharray="9 7" />
      </svg>
      <div style={{ display: "flex", fontFamily: "Figtree", fontWeight: 600, fontSize: 64, lineHeight: 1, color: MUTED }}>?</div>
    </div>
  );
}

function footer(icon: string) {
  return [
      <div key="mark" style={{ position: "absolute", left: 48, bottom: 44, display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={icon} width={52} height={52} style={{ width: 52, height: 52, borderRadius: 12 }} />
        <span style={{ fontFamily: "Figtree", fontWeight: 600, fontSize: 26, lineHeight: 1, color: PAPER }}>What Should We Watch</span>
      </div>,
      <div key="site" style={{ position: "absolute", right: 48, bottom: 52, display: "flex", fontFamily: "Figtree", fontWeight: 500, fontSize: 24, lineHeight: 1, color: MUTED }}>wsww.app</div>,
  ];
}

/** The people kinds (invite, group, expired, withdrawn): a disc row over a heading and a line. */
function People({ discs, heading, line }: { discs: (Disco | null | "dashed")[]; heading: string; line: string }) {
  return (
    <div style={{ width: 630, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 - RING, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {discs.map((d, i) => (d === "dashed" ? <DashedDisc key={i} first={i === 0} /> : <Disc key={i} disco={d} first={i === 0} />))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", marginTop: -RING }}>
        <div style={{ fontFamily: "Bricolage Grotesque", fontWeight: 600, fontSize: 58, lineHeight: 1.08, letterSpacing: "-0.025em", textWrap: "balance", maxWidth: 600, textAlign: "center" }}>{heading}</div>
        <div style={{ fontFamily: "Figtree", fontWeight: 400, fontSize: 29, lineHeight: 1.3, color: MUTED, textWrap: "pretty", maxWidth: 560, textAlign: "center" }}>{pretty(line)}</div>
      </div>
    </div>
  );
}

function Film({ title, year, poster, pitch, from, line }: { title: string; year: number | null; poster: string | null; pitch: string | null; from: Person | null; line: string | null }) {
  return (
    <div style={{ width: 630, display: "flex", alignItems: "center", gap: 40 }}>
      {poster ? (
        /* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */
        <img src={poster} width={280} height={420} style={{ width: 280, height: 420, borderRadius: 14, objectFit: "cover", flex: "none", background: HAIR }} />
      ) : (
        <div style={{ width: 280, height: 420, borderRadius: 14, border: `3px dashed ${DASHED}`, boxSizing: "border-box", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Figtree", fontWeight: 600, fontSize: 64, lineHeight: 1, color: MUTED }}>?</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Three lines at 50 px; a title over 40 characters drops to 42 px (board 20, C). */}
          <div style={{ fontFamily: "Bricolage Grotesque", fontWeight: 600, fontSize: Array.from(title).length > 40 ? 42 : 50, lineHeight: 1.05, letterSpacing: "-0.025em", textWrap: "balance" }}>{cut(title, TITLE_MAX)}</div>
          {year ? <div style={{ fontFamily: "Figtree", fontWeight: 400, fontSize: 29, lineHeight: 1.2, color: MUTED, display: "flex" }}>{String(year)}</div> : null}
        </div>
        {pitch && from ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 18, borderTop: `2px solid ${HAIR}` }}>
            <div style={{ fontFamily: "Figtree", fontWeight: 400, fontSize: 30, lineHeight: 1.3, textWrap: "pretty", display: "block" }}>{pretty(`“${pitch}”`)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width={40} height={40} viewBox="0 0 40 40" style={{ flex: "none" }}>
                <path d={shapePath((from.avatar || FALLBACK).shape, 40)} fill={HUE[(from.avatar || FALLBACK).hue] || HUE.coral} />
              </svg>
              <span style={{ fontFamily: "Figtree", fontWeight: 600, fontSize: 26, lineHeight: 1, color: MUTED }}>{nameOf(from)}</span>
            </div>
          </div>
        ) : line ? (
          <div style={{ fontFamily: "Figtree", fontWeight: 400, fontSize: 29, lineHeight: 1.3, color: MUTED, textWrap: "pretty", display: "block" }}>{pretty(line)}</div>
        ) : null}
      </div>
    </div>
  );
}

/* text-wrap: pretty, as the board's browser draws it: the last line never holds one word alone
   (Satori has no pretty), so the last two words are kept together. */
export const pretty = (t: string) => t.replace(/ (\S+)$/, "\u00a0$1");

const asset = (...p: string[]) => readFile(path.join(process.cwd(), ...p));
let loaded: Promise<{ fonts: { name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[]; icon: string }> | null = null;
function assets() {
  loaded ??= (async () => {
    const [f4, f5, f6, b6, icon] = await Promise.all([
      asset("src", "assets", "fonts", "Figtree_400Regular.ttf"),
      asset("src", "assets", "fonts", "Figtree_500Medium.ttf"),
      asset("src", "assets", "fonts", "Figtree_600SemiBold.ttf"),
      asset("src", "assets", "fonts", "BricolageGrotesque_600SemiBold.ttf"),
      asset("public", "apps", "what-should-we-watch", "apple-touch-icon-180.png"),
    ]);
    return {
      fonts: [
        { name: "Figtree", data: f4, weight: 400 as const, style: "normal" as const },
        { name: "Figtree", data: f5, weight: 500 as const, style: "normal" as const },
        { name: "Figtree", data: f6, weight: 600 as const, style: "normal" as const },
        { name: "Bricolage Grotesque", data: b6, weight: 600 as const, style: "normal" as const },
      ],
      icon: `data:image/png;base64,${icon.toString("base64")}`,
    };
  })().catch((e) => {
    loaded = null;
    throw e;
  });
  return loaded;
}

/* A film's card carries a photograph: as PNG it is about 400 KB, past the board's 200 KB and
   past what WhatsApp shows (it drops large preview images). Films are JPEG (quality 88, about
   80 KB, text still crisp); the people cards stay PNG (about 50 KB). */
export type ImageFormat = "png" | "jpeg";
export const formatFor = (path: "add" | "f"): ImageFormat => (path === "f" ? "jpeg" : "png");

async function encode(res: ImageResponse, format: ImageFormat, headers: Record<string, string>): Promise<Response> {
  const png = Buffer.from(await res.arrayBuffer());
  const body = format === "png" ? png : (() => {
    const img = PNG.sync.read(png);
    return jpeg.encode({ data: img.data, width: img.width, height: img.height }, 88).data;
  })();
  return new Response(new Uint8Array(body), { status: 200, headers: { ...headers, "Content-Type": format === "png" ? "image/png" : "image/jpeg", "Content-Length": String(body.length) } });
}

/** The preview image for one link. `poster` is the poster already fetched (a data URL) or null. */
export async function previewImage(p: Preview, poster: string | null, headers: Record<string, string>, format: ImageFormat = "png") {
  const { fonts, icon } = await assets();
  const c = copyFor(p);
  let body;
  switch (p.kind) {
    case "invite":
      body = <People discs={[p.from.avatar, "dashed"]} heading={c.heading} line={c.line} />;
      break;
    case "group":
      // The members' discs and the dashed one at the end; a pair is an invite, so a group is
      // three or more. Four discs fill the safe square (4 x 168 - 3 x 36 = 564 of 630 px).
      body = <People discs={[...p.members.slice(0, 3).map((m) => m.avatar), "dashed"]} heading={c.heading} line={c.line} />;
      break;
    case "expired":
    case "withdrawn":
      body = <People discs={["dashed"]} heading={c.heading} line={c.line} />;
      break;
    case "film":
      body = <Film title={p.film.title} year={p.film.year} poster={poster} pitch={p.pitch && p.from ? cut(p.pitch, 120) : null} from={p.from} line={p.pitch && p.from ? null : c.line} />;
      break;
    case "missing":
      body = <Film title={c.heading} year={null} poster={null} pitch={null} from={null} line={c.line} />;
      break;
  }
  const res = new ImageResponse(
    (
      <div style={{ width: OG_SIZE.width, height: OG_SIZE.height, background: GROUND, color: PAPER, fontFamily: "Figtree", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {body}
        {footer(icon)}
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
  return encode(res, format, headers);
}
