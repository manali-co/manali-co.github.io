import { NextResponse } from "next/server";
import { CODE, REACTIONS, TOKEN, WEB_ID, type Reaction } from "@/lib/wsww-link";
import { ipHeader, isManaliHost, WSWW_API } from "@/lib/wsww-link-server";

/* The film link page's two answers, forwarded to the app API (the browser only ever talks to this
   site, like the waitlist): POST /api/links/react {token, reaction, webId} and
   POST /api/links/keep {token, webId}. The token rides in the body both ways, so no request log
   (Vercel's or the API's) ever holds it. Only those fields go on, checked here first; the
   visitor's IP rides along for the API's per-visitor limits. Never cached, never logged. */

const PRIVATE = { "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow" };
const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...PRIVATE, ...extra } });

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (isManaliHost(req.headers) || (action !== "react" && action !== "keep")) return reply({ code: "not_found" }, 404);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = typeof b?.token === "string" ? b.token : "";
  // Not a token we could have made: the same answer as any other unavailable link.
  if (!TOKEN.test(token)) return reply({ code: "link_unavailable" }, 404);
  const webId = typeof b?.webId === "string" && WEB_ID.test(b.webId) ? b.webId : null;
  const reaction = REACTIONS.includes(b?.reaction as Reaction) ? (b?.reaction as Reaction) : null;
  if (!webId || (action === "react" && !reaction)) return reply({ code: "bad_request" }, 400);
  if (!WSWW_API) return reply({ code: "not_configured" }, 503);

  try {
    const res = await fetch(`${WSWW_API}/v1/links/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...ipHeader(req.headers) },
      body: JSON.stringify(action === "react" ? { token, reaction, webId } : { token, webId }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) {
      if (typeof data.code !== "string" || !CODE.test(data.code)) return reply({ code: "upstream" }, 502);
      const answer = { code: data.code, codeExpiresAt: typeof data.codeExpiresAt === "number" ? data.codeExpiresAt : null };
      return reply(action === "react" ? { told: data.told === true, ...answer } : answer);
    }
    // Unavailable and switched off look the same to the visitor: this link doesn't work here.
    if (res.status === 404) return reply({ code: data.code === "not_enabled" ? "not_enabled" : "link_unavailable" }, 404);
    if (res.status === 429) return reply({ code: "rate_limited" }, 429, { "retry-after": res.headers.get("retry-after") || "60" });
    if (res.status === 400 || res.status === 422) return reply({ code: "bad_request" }, 400);
    return reply({ code: "upstream" }, 502);
  } catch {
    return reply({ code: "upstream" }, 502);
  }
}
