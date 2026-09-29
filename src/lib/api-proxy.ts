import "server-only";
import { NextResponse } from "next/server";

/* The browser only ever talks to this site; these helpers forward to the Azure API with the site
   key. A missing backend answers 503 so the UI can say "not switched on here". */
const BASE = process.env.API_BASE_URL || "";
const KEY = process.env.API_KEY || "";
export const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;
export const CLIENT = /^[A-Za-z0-9_-]{16,64}$/;
export const CID = /^\d{13}-[0-9a-f]{6}$/;

export async function forward(path: string, init: RequestInit = {}, extra: Record<string, string> = {}) {
  if (!BASE) return NextResponse.json({ error: "backend not configured" }, { status: 503 });
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", "x-api-key": KEY, ...extra }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const body = await res.json().catch(() => ({}));
    // Pass through the answers the UI acts on; anything else is our problem, not the reader's.
    const status = [200, 202, 400, 404, 429].includes(res.status) ? res.status : 502;
    return NextResponse.json(status === 502 ? { error: "upstream" } : body, { status, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}

export async function jsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const bad = () => NextResponse.json({ error: "bad request" }, { status: 400 });
export const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
