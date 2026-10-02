import { NextResponse } from "next/server";

/* The What Should We Watch waitlist lives in the app's own backend, not this site's. The browser
   only talks to this site (the CSP allows nothing else); this route forwards to the app API.
   WSWW_API_BASE_URL is set per Vercel environment: prod API for production, dev API for previews.
   Unset, it answers 503 so the page says "try again" instead of breaking. */
const BASE = (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WORD = /^[a-z]{2,16}$/;

async function forward(path: string, init: RequestInit = {}) {
  if (!BASE) return NextResponse.json({ error: "waitlist not configured" }, { status: 503 });
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const body = await res.json().catch(() => ({}));
    // Pass through what the page acts on; anything else is our problem, not the visitor's.
    const status = [200, 201, 400, 422, 429].includes(res.status) ? (res.status === 422 ? 400 : res.status) : 502;
    return NextResponse.json(status === 502 ? { error: "upstream" } : body, { status, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}

export async function GET() {
  return forward("/v1/waitlist/count");
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    b = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const email = String(b.email || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  // Only the three words of a mark, and only if they look like words; anything else is dropped.
  const a = b.avatar as Record<string, unknown> | undefined;
  const avatar = a && [a.hue, a.shape, a.face].every((v) => typeof v === "string" && WORD.test(v)) ? { hue: a.hue, shape: a.shape, face: a.face } : undefined;
  return forward("/v1/waitlist", { method: "POST", body: JSON.stringify({ email, avatar, source: "manali.page" }) });
}
