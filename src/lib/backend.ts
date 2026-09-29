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

export async function subscribe(email: string, source = "site") {
  return call("/subscribe", { method: "POST", body: JSON.stringify({ email, source }) });
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

export async function unsubscribe(token: string): Promise<boolean> {
  try {
    const res = await call("/unsubscribe", { method: "POST", body: JSON.stringify({ token }) });
    return res.ok;
  } catch {
    return false;
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

export type AnnouncePost = { slug: string; title: string; summary: string; url: string; cover?: string; coverText?: string; project: string; date: string; author: string; force?: boolean };
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
