import "server-only";

/* The Azure Functions backend (subscribers, email, reactions). All calls fail soft: the site
   never breaks because the API is down. Two keys: API_KEY for the public proxy routes, and
   ADMIN_API_KEY, set only on the production deployment, for the owner's admin calls. */
const BASE = process.env.API_BASE_URL || "";
const KEY = process.env.API_KEY || "";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

async function call(path: string, init: RequestInit = {}, admin = false) {
  if (!BASE) throw new Error("API_BASE_URL is not set");
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": KEY, ...(admin ? { "x-admin-key": ADMIN_KEY } : {}), ...(init.headers || {}) },
    cache: "no-store",
  });
}

/* With a series, the address follows that one series (one email per new part) instead of every
   post. seriesTitle comes from the site's own content, never from the visitor. */
export async function subscribe(email: string, source = "site", series?: { slug: string; title: string }) {
  const extra = series ? { series: series.slug, seriesTitle: series.title } : {};
  return call("/subscribe", { method: "POST", body: JSON.stringify({ email, source, ...extra }) });
}

/* Returns true when the token was accepted, false when it was unknown, null when the API is off. */
export async function confirm(token: string): Promise<boolean | null> {
  try {
    const res = await call("/confirm", { method: "POST", body: JSON.stringify({ token }) });
    if (!res.ok) return null;
    return Boolean(((await res.json()) as { ok: boolean }).ok);
  } catch {
    return null;
  }
}

/* With a series, only that follow stops; "all" comes back when the address went entirely. */
export async function unsubscribe(token: string, series?: string): Promise<{ ok: boolean; scope: "all" | "series" }> {
  try {
    const res = await call("/unsubscribe", { method: "POST", body: JSON.stringify(series ? { token, series } : { token }) });
    const body = res.ok ? ((await res.json()) as { scope?: "all" | "series" }) : {};
    return { ok: res.ok, scope: body.scope === "series" ? "series" : "all" };
  } catch {
    return { ok: false, scope: "all" };
  }
}

export type AdminStats = { subscribers: number; pending: number; recent: { email: string; created: string; confirmed: boolean }[]; lastEmail?: { subject: string; sent: string; recipients: number } };

export async function adminStats(): Promise<AdminStats | null> {
  try {
    const res = await call("/admin/stats", {}, true);
    return res.ok ? ((await res.json()) as AdminStats) : null;
  } catch {
    return null;
  }
}

export type AdminReply = { slug: string; id: string; text: string; name: string; email: string; created: string };

export async function adminReplies(): Promise<AdminReply[] | null> {
  try {
    const res = await call("/admin/replies", {}, true);
    return res.ok ? ((await res.json()) as { replies: AdminReply[] }).replies : null;
  } catch {
    return null;
  }
}

export async function deleteReply(slug: string, id: string): Promise<boolean> {
  try {
    const res = await call(`/admin/replies/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
    return res.ok;
  } catch {
    return false;
  }
}

export type AnnouncePost = {
  slug: string; title: string; summary: string; url: string; cover?: string; coverText?: string; project: string; date: string; readTime?: string;
  author: string; authorKind: "person" | "agent"; authorName: string; authorOwner?: string;
  series?: string; seriesTitle?: string; seriesPart?: number; seriesTotal?: number; seriesUrl?: string;
  note?: string; force?: boolean;
};
export type EmailPreview = { from: string; subject: string; preheader: string; html: string; audience: number; followers: number };
export type AnnounceResult = { recipients: number; subscribers: number } | { error: "already" | "failed" };

export async function sendAnnouncement(post: AnnouncePost): Promise<AnnounceResult> {
  try {
    const res = await call("/admin/announce", { method: "POST", body: JSON.stringify(post) }, true);
    if (res.status === 409) return { error: "already" };
    if (!res.ok) return { error: "failed" };
    return (await res.json()) as { recipients: number; subscribers: number };
  } catch {
    return { error: "failed" };
  }
}

/* Every announcement sent, with who got it. `to` is null for sends from before recipient lists were
   kept; an entry's email is null when that person has since unsubscribed (their address is gone). */
export type Recipient = { email: string | null; ok: boolean; follower: boolean; reason: string };
export type Announcement = { id: string; slug: string; subject: string; sent: string; recipients: number; subscribers: number | null; to: Recipient[] | null };

export async function adminAnnouncements(): Promise<Announcement[] | null> {
  try {
    const res = await call("/admin/announcements", {}, true);
    return res.ok ? ((await res.json()) as { announcements: Announcement[] }).announcements : null;
  } catch {
    return null;
  }
}

/* The exact email a subscriber would get. Sends nothing. */
export async function previewAnnouncement(post: AnnouncePost, theme: "light" | "dark"): Promise<EmailPreview | null> {
  try {
    const res = await call(`/admin/announce/preview?theme=${theme}`, { method: "POST", body: JSON.stringify(post) }, true);
    return res.ok ? ((await res.json()) as EmailPreview) : null;
  } catch {
    return null;
  }
}

/* Comments: the owner's side. Public reading and posting go through /api/comments/*. */
export type AdminComment = { id: string; slug: string; title: string; parent: string; state: "pending" | "live" | "removed"; created: string; text: string; name: string; email: string; owner: boolean };

export async function adminComments(): Promise<AdminComment[] | null> {
  try {
    const res = await call("/admin/comments", {}, true);
    return res.ok ? ((await res.json()) as { comments: AdminComment[] }).comments : null;
  } catch {
    return null;
  }
}

export async function moderateComment(slug: string, id: string, action: "approve" | "remove"): Promise<boolean> {
  try {
    const res = await call(`/admin/comments/${encodeURIComponent(slug)}/${encodeURIComponent(id)}/${action}`, { method: "POST" }, true);
    return res.ok;
  } catch {
    return false;
  }
}

export async function ownerComment(slug: string, text: string, parent: string, title: string): Promise<boolean> {
  try {
    const res = await call(`/admin/comments/${encodeURIComponent(slug)}`, { method: "POST", body: JSON.stringify({ text, parent, title }) }, true);
    return res.ok;
  } catch {
    return false;
  }
}

/* From the stop link in a reply email. True when the API took the request (it never says
   whether the token matched); false when it didn't answer or answered with an error. */
export async function stopCommentEmails(post: string, id: string, token: string): Promise<boolean> {
  try {
    const res = await call("/comment-emails/stop", { method: "POST", body: JSON.stringify({ post, id, token }) });
    return res.ok;
  } catch {
    return false;
  }
}

/* Telemetry, read by the API from Application Insights. A failed read keeps its reason, so the
   panel can say what went wrong instead of showing zeros. */
export type TelemetryRange = "24h" | "7d";
export type TelemetryNow = { people: number; pages: { page: string; people: number; pageviews: number }[]; window: string };
export type Telemetry = {
  configured: true; range: TelemetryRange; step: string; now: TelemetryNow;
  totals: { pageviews: number; people: number; sessions: number; seconds: number; depth: number; errors: number; calls: number; failed: number };
  series: { t: string; pageviews: number; people: number; errors: number }[];
  pages: { page: string; pageviews: number; people: number; seconds: number; depth: number }[];
  referrers: { host: string; pageviews: number; people: number }[];
  events: { name: string; count: number; people: number }[];
  outbound: { host: string; count: number }[];
  devices: { device: string; pageviews: number }[];
  browsers: { browser: string; people: number }[];
  countries: { country: string; people: number }[];
  errors: { problemId: string; count: number; people: number; latest: string; message: string }[];
  api: { route: string; calls: number; failed: number; p95: number }[];
  // people (and times) at each step; countedFrom is when the reach/start events began
  engagement: Record<"read" | "reached" | "started" | "posted" | "reacted" | "subscribed" | "followed" | "loved" | "waitlist", { people: number; count: number }> & { countedFrom: string | null };
};
export type Read<T> = { ok: true; data: T | { configured: false } } | { ok: false; reason: string };

async function read<T>(path: string): Promise<Read<T>> {
  try {
    const res = await call(path, {}, true);
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    const detail = ((await res.json().catch(() => ({}))) as { detail?: string }).detail;
    return { ok: false, reason: detail || `the API answered ${res.status}` };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "the API didn't answer" };
  }
}

export const adminTelemetry = (range: TelemetryRange) => read<Telemetry>(`/admin/telemetry?range=${range}`);
export const adminTelemetryNow = () => read<{ configured: true } & TelemetryNow>("/admin/telemetry/now");

/* Every table the API keeps. Client ids and confirmation tokens arrive already shortened. */
export type StoredTable = { name: string; purpose: string; count: number; capped: boolean; updated: string | null };
export type TablePage = { name: string; purpose: string; columns: string[]; masked: string[]; rows: Record<string, unknown>[]; total: number; offset: number; limit: number };

/* `at` is when the answer came back, so "updated 3 min ago" reads the same on the server and in the browser. */
export async function adminData(): Promise<{ tables: StoredTable[] | null; at: number }> {
  try {
    const res = await call("/admin/data", {}, true);
    return { tables: res.ok ? ((await res.json()) as { tables: StoredTable[] }).tables : null, at: Date.now() };
  } catch {
    return { tables: null, at: Date.now() };
  }
}

export async function adminDataTable(table: string, offset: number): Promise<TablePage | null> {
  try {
    const res = await call(`/admin/data/${encodeURIComponent(table)}?offset=${Math.max(0, offset)}&limit=50`, {}, true);
    return res.ok ? ((await res.json()) as TablePage) : null;
  } catch {
    return null;
  }
}
