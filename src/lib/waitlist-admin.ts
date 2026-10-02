import "server-only";

/* The What Should We Watch waitlist, for the owner's /admin. Read server-side from the app API
   with its operator token (WSWW_ADMIN_TOKEN, production only), paging through the whole line,
   then summarised here, so neither the token nor the raw list ever reaches the browser beyond
   what the panel shows. */
const BASE = (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.WSWW_ADMIN_TOKEN || "";

export type WaitlistPlatform = "ios" | "android" | "none";
export type WaitlistPerson = {
  position: number;
  email: string;
  platform: WaitlistPlatform;
  joined: string; // ISO
  mark: { hue: string; shape: string; face: string } | null;
  source: string;
};
export type WaitlistSummary = {
  total: number;
  platforms: Record<WaitlistPlatform, number>;
  perDay: { day: string; joins: number }[]; // last 14 days, oldest first, UTC days
  latest: WaitlistPerson[]; // newest first
};

type Entry = { position?: number; email?: string; platform?: string | null; at?: number; avatar?: WaitlistPerson["mark"]; source?: string | null };

async function page(after: number): Promise<{ entries: Entry[]; next: number | null }> {
  const res = await fetch(`${BASE}/v1/waitlist?after=${after}&limit=1000`, { headers: { "x-admin-token": TOKEN }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`waitlist ${res.status}`);
  const body = (await res.json()) as { entries?: Entry[]; next?: number | null };
  return { entries: body.entries || [], next: body.next ?? null };
}

/* null when the API isn't configured or can't be read; the panel says so. */
export async function waitlistSummary(now = new Date()): Promise<WaitlistSummary | null> {
  if (!BASE || !TOKEN) return null;
  try {
    const all: Entry[] = [];
    for (let after = 0, guard = 0; guard < 100; guard++) {
      const { entries, next } = await page(after);
      all.push(...entries);
      if (next === null) break;
      after = next;
    }
    const people: WaitlistPerson[] = all.map((e) => ({
      position: Number(e.position) || 0,
      email: String(e.email || ""),
      platform: e.platform === "ios" || e.platform === "android" ? e.platform : "none",
      joined: new Date((Number(e.at) || 0) * 1000).toISOString(),
      mark: e.avatar && e.avatar.hue ? e.avatar : null,
      source: String(e.source || ""),
    }));
    const platforms = { ios: 0, android: 0, none: 0 } as Record<WaitlistPlatform, number>;
    for (const p of people) platforms[p.platform]++;
    const perDay: WaitlistSummary["perDay"] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)).toISOString().slice(0, 10);
      perDay.push({ day, joins: people.filter((p) => p.joined.slice(0, 10) === day).length });
    }
    const latest = [...people].sort((a, b) => b.position - a.position).slice(0, 10);
    return { total: people.length, platforms, perDay, latest };
  } catch {
    return null;
  }
}
