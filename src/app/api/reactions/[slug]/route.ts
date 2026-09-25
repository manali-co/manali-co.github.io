import { NextResponse } from "next/server";

/* Reactions live in the Azure backend; the browser only ever talks to this route. The client
   id is a random string the browser keeps in localStorage: no account, no IP, nothing personal. */
const BASE = process.env.API_BASE_URL || "";
const KEY = process.env.API_KEY || "";
const KINDS = new Set(["thumbs-up", "heart", "rocket", "eyes", "laugh", "sun"]);
const ok = (s: string, re: RegExp) => re.test(s);

async function upstream(path: string, init?: RequestInit) {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", "x-api-key": KEY }, cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = new URL(req.url).searchParams.get("client") || "";
  if (!ok(slug, /^[a-z0-9][a-z0-9-]{0,120}$/)) return NextResponse.json({ error: "bad slug" }, { status: 400 });
  const data = await upstream(`/reactions/${slug}?client=${encodeURIComponent(client)}`);
  return NextResponse.json(data || { counts: {}, mine: [], unavailable: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: { client?: string; kind?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const client = String(body.client || ""), kind = String(body.kind || "");
  if (!ok(slug, /^[a-z0-9][a-z0-9-]{0,120}$/) || !ok(client, /^[A-Za-z0-9_-]{16,64}$/) || !KINDS.has(kind)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const data = await upstream(`/reactions/${slug}`, { method: "POST", body: JSON.stringify({ client, kind }) });
  if (!data) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json(data);
}
