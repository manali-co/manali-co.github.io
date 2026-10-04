import { NextResponse } from "next/server";

/* Leaving the What Should We Watch waitlist: the leave page posts {token} here, and mail apps'
   one-click unsubscribe (RFC 8058) posts a form to ?token=. Both forward to the app API, which
   checks the token's signature; any valid token answers the same, so nothing about who is in
   line leaks. */
const BASE = (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN = /^wl_[0-9a-f]{64}\.[A-Za-z0-9_-]{8,64}$/;

export async function POST(req: Request) {
  let token = new URL(req.url).searchParams.get("token") || "";
  if (!token && (req.headers.get("content-type") || "").includes("application/json")) {
    const b = (await req.json().catch(() => null)) as { token?: unknown } | null;
    token = typeof b?.token === "string" ? b.token : "";
  }
  if (!TOKEN.test(token)) return NextResponse.json({ error: "bad_link" }, { status: 400 });
  if (!BASE) return NextResponse.json({ error: "waitlist not configured" }, { status: 503 });
  try {
    const res = await fetch(`${BASE}/v1/waitlist/leave?token=${encodeURIComponent(token)}`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000) });
    const status = res.ok ? 200 : res.status === 400 || res.status === 422 ? 400 : 502;
    return NextResponse.json(status === 200 ? { ok: true } : { error: status === 400 ? "bad_link" : "upstream" }, { status, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
