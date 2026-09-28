import { NextResponse } from "next/server";
import { subscribe } from "@/lib/backend";

/* Always 202 for a well-formed address: the answer never says whether someone is already on
   the list. The backend throttles confirmation emails per address. */
export async function POST(req: Request) {
  let email = "";
  try {
    email = String(((await req.json()) as { email?: string }).email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  try {
    const res = await subscribe(email);
    if (res.status === 400) return NextResponse.json({ error: "invalid email" }, { status: 400 });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "backend not configured" }, { status: 503 });
  }
}
