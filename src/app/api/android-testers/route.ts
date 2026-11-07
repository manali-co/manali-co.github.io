import { NextResponse } from "next/server";
import { checkTesterEmail } from "@/lib/android-testers";

/* wsww.app/android's sign-ups, kept apart from the waitlist on purpose: joining the waitlist sends a
   welcome email and owes a launch email, and this page promises no marketing. The list is a Google
   Form owned by wsww.app@gmail.com, read by the person who adds each address to the Play test. It only
   lasts as long as the closed test. The browser only talks to this site (the CSP allows nothing else). */
const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSec_l8__4eHLoAxO4edw24VNbVDUaZUi-dMqR9iIo9d2MdCpQ/formResponse";
const FIELD = "entry.1758972092";
const NO_STORE = { "cache-control": "no-store" };

// Per instance, so a rough limit only: enough to stop one visitor filling the list by accident or for fun.
const LIMIT = 5;
const WINDOW_MS = 60_000;
const recent = new Map<string, number[]>();
function allowed(ip: string, now: number): boolean {
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) { recent.set(ip, hits); return false; }
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return true;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400, headers: NO_STORE });
  }
  const email = String(body.email ?? "").trim();
  // The same check the page ran, so a typo can't reach the list by calling this directly.
  const problem = checkTesterEmail(email);
  if (problem) return NextResponse.json({ error: problem.err }, { status: 400, headers: NO_STORE });
  // Honeypot: a hidden field people never fill. Answer as if it worked and store nothing.
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true }, { headers: NO_STORE });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!allowed(ip, Date.now())) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  try {
    const res = await fetch(FORM, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ [FIELD]: email }).toString(),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    // A form that closed or changed redirects to a sign-in or "no longer accepting" page; that isn't saved.
    if (!res.ok) throw new Error(`form ${res.status}`);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    // Never the address.
    console.error("android_testers_form_failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
  }
}
