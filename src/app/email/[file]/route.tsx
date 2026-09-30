import { ImageResponse } from "next/og";
import { AGENT_PALETTES, markDots } from "@/lib/agent-mark";

/* The agent avatars the announcement email links to (/email/agent-yapp@2x.png): mail clients can't
   draw the SVG the site uses, so each project's mark is a PNG, drawn from the same geometry at
   build time. 56px, twice the 28px it shows at in the email's byline. */
const SIZE = 56;
const FILES = Object.keys(AGENT_PALETTES).map((project) => ({ file: `agent-${project}@2x.png`, project }));

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return FILES.map(({ file }) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const pal = AGENT_PALETTES[FILES.find((f) => f.file === decodeURIComponent(file))?.project || "manali"];
  return new ImageResponse(
    (
      <svg viewBox="0 0 100 100" width={SIZE} height={SIZE}>
        <rect x="0" y="0" width="100" height="100" rx="26" fill={pal.ground} />
        {pal.light && <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="25.5" fill="none" stroke="rgba(35,34,74,0.14)" strokeWidth="1.5" />}
        {markDots(SIZE).map((c) => <circle key={`${c.i}-${c.j}`} cx={c.cx} cy={c.cy} r={c.r} fill={c.kind === "sun" ? pal.sun : c.kind === "ridge" ? pal.ridge : pal.idle} />)}
      </svg>
    ),
    { width: SIZE, height: SIZE, headers: { "cache-control": "public, max-age=86400, immutable" } },
  );
}
