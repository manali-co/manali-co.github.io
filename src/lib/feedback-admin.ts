import "server-only";

/* What Should We Watch in-app feedback, for the owner's /admin. Read server-side from the app API's
   operator-only GET /v1/feedback with the same token as the waitlist (WSWW_ADMIN_TOKEN), so the
   token never reaches the browser. Read-only: the API has no resolve or delete. */
const BASE = (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.WSWW_ADMIN_TOKEN || "";
export const FEEDBACK_LIMIT = 500; // the API's ceiling

export type FeedbackType = "bug" | "idea" | "other";
export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  message: string;
  /* "clerk:<id>" a signed-in member, "dev:<id>" a guest's device, null a guest with no id. Opaque. */
  userId: string | null;
  appVersion: string | null;
  platform: "ios" | "android" | "web" | null;
  device: string | null;
  at: number; // unix seconds
};
/* unconfigured: the token or base URL is missing here, or the API says viewing isn't set up (503).
   unreachable: anything else, so a failed read never looks like "no feedback". */
export type FeedbackData = { state: "ready"; items: FeedbackItem[] } | { state: "unconfigured" } | { state: "unreachable"; error: string };

type Row = { id?: string; type?: string; message?: string; userId?: string | null; appVersion?: string | null; platform?: string | null; device?: string | null; at?: number };

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function adminFeedback(): Promise<FeedbackData> {
  if (!BASE || !TOKEN) return { state: "unconfigured" };
  try {
    const res = await fetch(`${BASE}/v1/feedback?limit=${FEEDBACK_LIMIT}`, { headers: { "x-admin-token": TOKEN }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (res.status === 503) return { state: "unconfigured" };
    if (!res.ok) return { state: "unreachable", error: `HTTP ${res.status}` };
    const rows = ((await res.json()) as { feedback?: Row[] }).feedback || [];
    const items = rows.map((r, i): FeedbackItem => ({
      id: String(r.id || `row-${i}`),
      type: r.type === "bug" || r.type === "idea" ? r.type : "other",
      message: String(r.message || ""),
      userId: text(r.userId),
      appVersion: text(r.appVersion),
      platform: r.platform === "ios" || r.platform === "android" || r.platform === "web" ? r.platform : null,
      device: text(r.device),
      at: Number(r.at) || 0,
    })).sort((a, b) => b.at - a.at);
    return { state: "ready", items };
  } catch (e) {
    console.error("feedback admin read failed", e);
    return { state: "unreachable", error: e instanceof Error && e.name === "TimeoutError" ? "timed out" : "no answer" };
  }
}
