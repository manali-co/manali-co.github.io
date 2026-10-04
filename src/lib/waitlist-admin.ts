import "server-only";

/* The What Should We Watch waitlist, for the owner's /admin. Read server-side from the app API
   with its operator token (WSWW_ADMIN_TOKEN, production only), paging through the whole line,
   then summarised here, so neither the token nor the raw list ever reaches the browser beyond
   what the panel shows. */
const BASE = (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.WSWW_ADMIN_TOKEN || "";

export type WaitlistPlatform = "ios" | "android" | "none";
/* The "You're in" email, per person: never colour alone on the panel (icon + word). */
export type WelcomeStatus = "pending" | "sent" | "delivered" | "bounced" | "spam" | "left";
export type WelcomeCounts = Record<"sent" | "delivered" | "bounced" | "spam" | "left" | "pending", number>;
export type WaitlistPerson = {
  position: number;
  email: string;
  platform: WaitlistPlatform;
  joined: string; // ISO
  mark: { hue: string; shape: string; face: string } | null;
  source: string;
  welcome: WelcomeStatus;
};
export type WaitlistSummary = {
  total: number;
  platforms: Record<WaitlistPlatform, number>;
  perDay: { day: string; joins: number }[]; // last 14 days, oldest first, UTC days
  latest: WaitlistPerson[]; // newest first
  /* The welcome email: delivery counts, who the next send would reach (a sample), and whether
     sending is set up on the API at all. */
  /* preview: "ok" when the dry run answered; "failed" when it didn't (that says nothing about
     whether email is set up, so the strip offers a reload instead of a send). */
  welcome: { counts: WelcomeCounts; sample: string[]; ready: boolean; preview: "ok" | "failed" };
};

type Entry = { position?: number; email?: string; platform?: string | null; at?: number; avatar?: WaitlistPerson["mark"]; source?: string | null; welcomeStatus?: string | null; doNotEmail?: boolean };
type Summary = { sent?: number; delivered?: number; bounced?: number; complained?: number; left?: number; pending?: number };

const welcomeOf = (s: string | null | undefined): WelcomeStatus =>
  s === "delivered" ? "delivered" : s === "bounced" ? "bounced" : s === "complained" ? "spam" : s === "sent" || s === "delayed" ? "sent" : "pending";

async function page(after: number): Promise<{ entries: Entry[]; next: number | null; welcome?: Summary }> {
  const res = await fetch(`${BASE}/v1/waitlist?after=${after}&limit=1000`, { headers: { "x-admin-token": TOKEN }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`waitlist ${res.status}`);
  const body = (await res.json()) as { entries?: Entry[]; next?: number | null; welcome?: Summary };
  return { entries: body.entries || [], next: body.next ?? null, welcome: body.welcome };
}

/* null when the API isn't configured or can't be read; the panel says so. */
export async function waitlistSummary(now = new Date()): Promise<WaitlistSummary | null> {
  if (!BASE || !TOKEN) return null;
  try {
    const all: Entry[] = [];
    let summary: Summary = {};
    // At most 100 pages (100,000 people); past that, partial numbers would be wrong numbers.
    let done = false;
    for (let after = 0, pages = 0; pages < 100; pages++) {
      const { entries, next, welcome } = await page(after);
      if (welcome) summary = welcome;
      all.push(...entries);
      if (next === null) { done = true; break; }
      after = next;
    }
    if (!done) throw new Error("waitlist larger than the page guard");
    const people: WaitlistPerson[] = all.map((e) => ({
      position: Number(e.position) || 0,
      email: String(e.email || ""),
      platform: e.platform === "ios" || e.platform === "android" ? e.platform : "none",
      joined: new Date((Number(e.at) || 0) * 1000).toISOString(),
      mark: e.avatar && e.avatar.hue ? e.avatar : null,
      source: String(e.source || ""),
      // on the do-not-email list: show why rather than "not sent" (bounce/spam keep their own word)
      welcome: e.doNotEmail && welcomeOf(e.welcomeStatus) === "pending" ? "left" : welcomeOf(e.welcomeStatus),
    }));
    const platforms = { ios: 0, android: 0, none: 0 } as Record<WaitlistPlatform, number>;
    for (const p of people) platforms[p.platform]++;
    const perDay: WaitlistSummary["perDay"] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)).toISOString().slice(0, 10);
      perDay.push({ day, joins: people.filter((p) => p.joined.slice(0, 10) === day).length });
    }
    const latest = [...people].sort((a, b) => b.position - a.position).slice(0, 10);
    // Who a send would reach right now (dry run: nothing is sent), for the confirm step.
    const dry = await fetch(`${BASE}/v1/waitlist/welcome`, { method: "POST", headers: { "x-admin-token": TOKEN, "content-type": "application/json" }, body: JSON.stringify({ dryRun: true }), cache: "no-store", signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? (r.json() as Promise<{ count?: number; sample?: string[]; ready?: boolean }>) : null)).catch(() => null);
    const counts: WelcomeCounts = {
      sent: summary.sent ?? 0, delivered: summary.delivered ?? 0, bounced: summary.bounced ?? 0,
      spam: summary.complained ?? 0, left: summary.left ?? 0, pending: dry?.count ?? summary.pending ?? 0,
    };
    return { total: people.length, platforms, perDay, latest, welcome: { counts, sample: dry?.sample ?? [], ready: !!dry?.ready, preview: dry ? "ok" : "failed" } };
  } catch {
    return null;
  }
}

/* The owner's "send it to everyone who hasn't had it". The API decides who that is (never anyone
   who already got it, bounced, complained or left) and sends in batches. */
export async function sendWaitlistWelcome(): Promise<{ sent: number; failed: number; reason?: string; at: string } | { error: string }> {
  if (!BASE || !TOKEN) return { error: "Waitlist not configured." };
  try {
    const res = await fetch(`${BASE}/v1/waitlist/welcome`, { method: "POST", headers: { "x-admin-token": TOKEN, "content-type": "application/json" }, body: JSON.stringify({ dryRun: false }), cache: "no-store", signal: AbortSignal.timeout(60000) });
    if (res.status === 503) return { error: "Email isn't set up." };
    if (!res.ok) return { error: `The API answered ${res.status}.` };
    const b = (await res.json()) as { sent?: number; failed?: { reason?: string }[]; at?: number };
    const failed = b.failed || [];
    return { sent: b.sent ?? 0, failed: failed.length, reason: failed[0]?.reason, at: new Date((b.at ?? Date.now() / 1000) * 1000).toISOString() };
  } catch {
    // A timeout can land after the API started sending: we can't know how many went out.
    return { error: "unknown" };
  }
}
