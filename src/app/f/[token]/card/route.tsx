import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchLink, isManaliHost } from "@/lib/wsww-link-server";
import { factsLine, senderName } from "@/lib/wsww-link";

/* The link's rich preview: Claude Design, Taste together 8, #6 "the preview card without a
   poster", 1200 × 630 (drawn at half). Title in display type, the facts, the sender in the kicker,
   the app's mark without a face (a preview is not Disco speaking), graphite in every chat app since
   previews don't follow the viewer's theme. No poster until the licence check clears. */

export const dynamic = "force-dynamic";

// Scoped paths, so the build traces only these files (next.config.ts lists them for the bundle).
const font = (file: string) => readFile(path.join(process.cwd(), "src", "assets", "fonts", file));
const appIcon = () => readFile(path.join(process.cwd(), "public", "apps", "what-should-we-watch", "apple-touch-icon-180.png"));

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const none = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  if (isManaliHost(req.headers)) return none();
  const r = await fetchLink(token, req.headers);
  if (r.state !== "ok") return none();
  const { link } = r;
  const [display, body, micro, icon] = await Promise.all([
    font("BricolageGrotesque_600SemiBold.ttf"),
    font("Figtree_400Regular.ttf"),
    font("Figtree_500Medium.ttf"),
    appIcon(),
  ]);
  const title = link.film.title;
  // 52/54 at half size; long titles step down so they stay within three lines.
  const size = title.length > 48 ? 72 : title.length > 26 ? 88 : 104;
  const kicker = link.from.firstName.trim() ? `${senderName(link)} thinks you’d like this` : "Someone thinks you’d like this";
  // The mark's three discs, blended toward white where they overlap (screen), as an SVG: the card
  // renderer draws SVG blend modes but not CSS ones. Board coordinates, 28px box.
  const circles = ([[14, 11.2, "#E8796F"], [10.1, 17.4, "#AE9BE0"], [17.9, 17.4, "#4DBFB0"]] as const)
    .map(([cx, cy, c]) => `<circle cx="${cx}" cy="${cy}" r="8.1" fill="${c}" style="mix-blend-mode:screen"/>`)
    .join("");
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 28 28"><g style="isolation:isolate">${circles}</g></svg>`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#17181B", color: "#F2F1EE", fontFamily: "Figtree" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og */}
          <img src={`data:image/png;base64,${icon.toString("base64")}`} width={72} height={72} style={{ borderRadius: 18 }} alt="" />
          <div style={{ fontFamily: "Figtree Medium", fontSize: 26, lineHeight: "28px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8A8E", display: "flex" }}>{kicker}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontFamily: "Bricolage Grotesque", fontSize: size, lineHeight: 1.04, letterSpacing: "-0.025em", display: "block", lineClamp: 3, maxWidth: 1040 }}>{title}</div>
          <div style={{ fontSize: 40, lineHeight: "52px", color: "#9D9D9B", display: "flex" }}>{factsLine(link)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og */}
          <img src={`data:image/svg+xml;base64,${Buffer.from(mark).toString("base64")}`} width={56} height={56} alt="" />
          <div style={{ fontSize: 32, lineHeight: "40px", color: "#8A8A8E", display: "flex" }}>wsww.app</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Bricolage Grotesque", data: display, weight: 600, style: "normal" },
        { name: "Figtree", data: body, weight: 400, style: "normal" },
        { name: "Figtree Medium", data: micro, weight: 500, style: "normal" },
      ],
      headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" },
    }
  );
}
