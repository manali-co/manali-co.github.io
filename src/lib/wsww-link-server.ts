import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { parseFilmLink, TOKEN, type FilmLink } from "./wsww-link";
export { isManaliHost } from "./wsww-host";

/* Server side of the film link pages. The browser never calls the app's API: the page reads the
   link here, and the answers go through this site's /api/links/ routes, like the waitlist.
   WSWW_API_BASE_URL is set per Vercel environment (prod API for production, dev API for previews).
   The token is a secret the sender shared: it goes to the API and nowhere else, and it is never
   logged here. */
export const WSWW_API = (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");
/** The API's public link routes (routers/links.py): only this server calls them, with its secret.
    /v1/links (no /public) is the app's own Links you shared, behind a sign-in. */
export const LINKS_API = `${WSWW_API}/v1/public/links`;

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
/* Every public link call needs this site's proxy secret (WSWW_WEB_PROXY_SECRET, the API's Key Vault
   `web-proxy-secret`, sent as X-WSWW-Proxy-Secret): without it the API answers 403 proxy_required,
   and 503 links_unavailable when it has none configured. The secret also vouches for
   X-WSWW-Client-IP, so each visitor gets their own limits; a call without the IP shares one bucket
   with every other such call. The secret only ever goes to the API: never to the browser, never into
   a page or an answer, never logged. */
const PROXY_SECRET = process.env.WSWW_WEB_PROXY_SECRET || "";
export const proxyHeaders = (h: Headers): Record<string, string> => {
  const ip = visitorIp(h);
  return { ...(PROXY_SECRET ? { "x-wsww-proxy-secret": PROXY_SECRET } : {}), ...(ip ? { "x-wsww-client-ip": ip } : {}) };
};

/* ok: the film. unavailable: unknown, expired, revoked or blocked (one answer for all, by design),
   a malformed token, an add-a-friend token (it reads as {kind: "add"}: not a film), or social
   switched off on this API (404 not_enabled). busy: rate limited (429), the API down, refusing
   this server (403 proxy_required: a missing or wrong secret) or not configured (503): worth
   another try, and an alert's business, not the visitor's. */
export type LinkResult = { state: "ok"; link: FilmLink } | { state: "unavailable" } | { state: "busy" };

export async function fetchLink(token: string, h: Headers): Promise<LinkResult> {
  if (!TOKEN.test(token)) return { state: "unavailable" };
  if (!WSWW_API) return { state: "busy" };
  try {
    // The token rides in the body, never in a URL: the API logs request URLs in full.
    const res = await fetch(`${LINKS_API}/read`, {
      method: "POST",
      headers: { "content-type": "application/json", ...proxyHeaders(h) },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { state: "unavailable" };
    if (!res.ok) return { state: "busy" };
    const body = (await res.json().catch(() => null)) as { kind?: unknown } | null;
    if (body?.kind === "add") return { state: "unavailable" };
    const link = parseFilmLink(body);
    return link ? { state: "ok", link } : { state: "busy" };
  } catch {
    return { state: "busy" };
  }
}

/** One API read per page render: the metadata and the page share it. */
export const getLink = cache(async (token: string) => fetchLink(token, await headers()));
