import { NextResponse } from "next/server";

/* The browser posts here; the server forwards with the API key. Nothing about the reply is
   echoed back. */
const BASE = process.env.API_BASE_URL || "";
const KEY = process.env.API_KEY || "";
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug)) return NextResponse.json({ error: "bad slug" }, { status: 400 });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const pick = (k: string, n: number) => String(body[k] ?? "").slice(0, n);
  const payload = { client: pick("client", 64), text: pick("text", 1000), name: pick("name", 80), email: pick("email", 254), title: pick("title", 200) };
  if (!payload.text.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (!BASE) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  try {
    const res = await fetch(`${BASE}/replies/${slug}`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": KEY }, body: JSON.stringify(payload), cache: "no-store" });
    if (res.status === 429) return NextResponse.json({ error: "slow down" }, { status: 429 });
    if (res.status === 400 || res.status === 422) return NextResponse.json({ error: "invalid" }, { status: 400 });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
