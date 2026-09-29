import { NextResponse } from "next/server";

/* Reactions live in the Azure backend; the browser only ever talks to this route. The client
   id is a random string the browser keeps in localStorage: no account, no IP, nothing personal.
   It travels in a header or a POST body, never in a URL, so it never lands in a request log. */
const BASE = process.env.API_BASE_URL || "";
const KEY = process.env.API_KEY || "";
const KINDS = new Set(["heart", "idea", "laugh", "rocket", "sun"]); // the five the redesign offers; the API still keeps old thumbs-up and eyes counts
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;
const CLIENT = /^[A-Za-z0-9_-]{16,64}$/;

async function upstream(path: string, init: RequestInit = {}, extra: Record<string, string> = {}) {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", "x-api-key": KEY, ...extra }, cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug)) return NextResponse.json({ error: "bad slug" }, { status: 400 });
  const client = req.headers.get("x-client") || "";
  const data = await upstream(`/reactions/${slug}`, {}, CLIENT.test(client) ? { "x-client": client } : {});
  return NextResponse.json(data || { counts: {}, mine: [], unavailable: true }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: { client?: string; kind?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const client = String(body.client || ""), kind = String(body.kind || "");
  if (!SLUG.test(slug) || !CLIENT.test(client) || !KINDS.has(kind)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const data = await upstream(`/reactions/${slug}`, { method: "POST", body: JSON.stringify({ client, kind }) });
  if (!data) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json(data);
}
