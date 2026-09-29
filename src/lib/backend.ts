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

export type AnnouncePost = { slug: string; title: string; summary: string; url: string; cover?: string; coverText?: string; project: string; date: string; author: string; series?: string; seriesTitle?: string; force?: boolean };
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
