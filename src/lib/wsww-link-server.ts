import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { parseFilmLink, TOKEN, type FilmLink } from "./wsww-link";

/* Server side of the film link pages. The browser never calls the app's API: the page reads the
   link here, and the answers go through this site's /api/links/ routes, like the waitlist.
   WSWW_API_BASE_URL is set per Vercel environment (prod API for production, dev API for previews).
   The token is a secret the sender shared: it goes to the API and nowhere else, and it is never
   logged here. */
export const WSWW_API = (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");

/** manali.page is the blog; wsww.app's paths (the links, the AASA file) don't answer there. */
const MANALI_HOSTS = new Set(["manali.page", "www.manali.page"]);
export const hostOf = (h: Headers) => (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
export const isManaliHost = (h: Headers) => MANALI_HOSTS.has(hostOf(h));

/** The origin this request came in on, for absolute preview URLs (wsww.app in production, the
    preview's own address on a preview deploy). */
export function originOf(h: Headers): string {
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim() === "http" ? "http" : "https";
  return /^[A-Za-z0-9.-]+(:\d+)?$/.test(host) ? `${proto}://${host}` : "https://wsww.app";
}

/** The visitor's IP as Vercel saw it (leftmost X-Forwarded-For), for the API's per-visitor rate
    limits. Only forwarded, never stored here. */
export function visitorIp(h: Headers): string | null {
  const first = (h.get("x-forwarded-for") || "").split(",")[0].trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(first) ? first : null;
}
export const ipHeader = (h: Headers): Record<string, string> => {
  const ip = visitorIp(h);
  return ip ? { "x-wsww-client-ip": ip } : {};
};

/* ok: the film. unavailable: unknown, expired, revoked or blocked (one answer for all, by design),
   a malformed token, or social switched off on this API (not_enabled). busy: rate limited, the
   API down or not configured: worth another try. */
export type LinkResult = { state: "ok"; link: FilmLink } | { state: "unavailable" } | { state: "busy" };

export async function fetchLink(token: string, h: Headers): Promise<LinkResult> {
  if (!TOKEN.test(token)) return { state: "unavailable" };
  if (!WSWW_API) return { state: "busy" };
  try {
    // The token rides in the body, never in a URL: the API logs request URLs in full.
    const res = await fetch(`${WSWW_API}/v1/links/read`, {
      method: "POST",
      headers: { "content-type": "application/json", ...ipHeader(h) },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { state: "unavailable" };
    if (!res.ok) return { state: "busy" };
    const link = parseFilmLink(await res.json().catch(() => null));
    return link ? { state: "ok", link } : { state: "busy" };
  } catch {
    return { state: "busy" };
  }
}

/** One API read per page render: the metadata and the page share it. */
export const getLink = cache(async (token: string) => fetchLink(token, await headers()));
