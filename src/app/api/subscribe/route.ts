import { NextResponse } from "next/server";
import { subscribe } from "@/lib/backend";
import { seriesTitle } from "@/lib/series";

/* Always 202 for a well-formed address: the answer never says whether someone is already on
   the list. The backend throttles confirmation emails per address. */
export async function POST(req: Request) {
  let email = "", series = "";
  try {
    const body = (await req.json()) as { email?: unknown; series?: unknown } | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });
    email = String(body.email || "").trim().toLowerCase();
    series = typeof body.series === "string" ? body.series : "";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  // Following one series: only a series this site has, and its title from the site's content.
  const title = series ? seriesTitle(series) : null;
  if (series && !title) return NextResponse.json({ error: "unknown series" }, { status: 400 });
  try {
    const res = await subscribe(email, series ? "series" : "site", title ? { slug: series, title } : undefined);
    if (res.status === 400) return NextResponse.json({ error: "invalid email" }, { status: 400 });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "backend not configured" }, { status: 503 });
  }
}
