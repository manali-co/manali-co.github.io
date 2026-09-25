/* The Azure Functions backend (subscribers, email). All calls fail soft: the site never
   breaks because the API is down. */
const BASE = process.env.API_BASE_URL || "";
const KEY = process.env.API_KEY || "";

async function call(path: string, init: RequestInit = {}) {
  if (!BASE) throw new Error("API_BASE_URL is not set");
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": KEY, ...(init.headers || {}) },
    cache: "no-store",
  });
}

export async function subscribe(email: string, source = "site") {
  return call("/subscribe", { method: "POST", body: JSON.stringify({ email, source }) });
}

export async function unsubscribe(token: string) {
  try {
    const res = await call("/unsubscribe", { method: "POST", body: JSON.stringify({ token }) });
    return res.ok;
  } catch {
    return false;
  }
}

export type AdminStats = { subscribers: number; recent: { email: string; created: string; confirmed: boolean }[]; lastEmail?: { subject: string; sent: string; recipients: number } };

export async function adminStats(): Promise<AdminStats | null> {
  try {
    const res = await call("/admin/stats");
    return res.ok ? ((await res.json()) as AdminStats) : null;
  } catch {
    return null;
  }
}

export type AnnouncePost = { slug: string; title: string; summary: string; url: string; cover?: string; coverText?: string; project: string; date: string; author: string };

export async function sendAnnouncement(post: AnnouncePost) {
  const res = await call("/admin/announce", { method: "POST", body: JSON.stringify(post) });
  return res.ok ? ((await res.json()) as { recipients: number }) : null;
}
