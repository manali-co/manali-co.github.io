import { NextResponse } from "next/server";
import { subscribe } from "@/lib/backend";

export async function POST(req: Request) {
  let email = "";
  try {
    email = String(((await req.json()) as { email?: string }).email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  try {
    const res = await subscribe(email);
    if (res.status === 409) return NextResponse.json({ ok: true, already: true }, { status: 409 });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "backend not configured" }, { status: 503 });
  }
}
