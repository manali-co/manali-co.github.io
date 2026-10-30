import { parsePreview, TOKEN, type LinkPath, type Preview } from "./wsww-preview";

/* The server side of link previews: one read of the API's preview call per render. The token is a
   secret the sender shared: it goes to the API in a POST body (the API logs URLs in full) and
   nowhere else, and it is never logged here.

   WSWW_API_BASE_URL is set per Vercel environment. The API answers the public link calls only
   with this site's proxy secret (WSWW_WEB_PROXY_SECRET, the API's Key Vault `web-proxy-secret`),
   which vouches for X-WSWW-Client-IP (the fetcher's address, for its per-fetcher limit). The
   secret never reaches a browser, a page or a log. */
const API = () => (process.env.WSWW_API_BASE_URL || "").replace(/\/$/, "");
const SECRET = () => process.env.WSWW_WEB_PROXY_SECRET || "";

/** The fetcher's IP as Vercel saw it (leftmost X-Forwarded-For). Forwarded, never stored. */
export function visitorIp(h: Headers): string | null {
  const first = (h.get("x-forwarded-for") || "").split(",")[0].trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(first) ? first : null;
}

/** ok: what the card shows. busy: the API down, slow, limited or not configured: no preview at
    all this time (a messenger then shows the bare URL, board 20 "No preview at all"). */
export type PreviewResult = { state: "ok"; preview: Preview } | { state: "busy" };

export async function fetchPreview(path: LinkPath, token: string, h: Headers): Promise<PreviewResult> {
  if (!TOKEN.test(token)) return { state: "busy" };
  const api = API(), secret = SECRET();
  if (!api || !secret) return { state: "busy" };
  const ip = visitorIp(h);
  try {
    const res = await fetch(`${api}/v1/public/links/preview`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-wsww-proxy-secret": secret, ...(ip ? { "x-wsww-client-ip": ip } : {}) },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { state: "busy" };
    const preview = parsePreview(await res.json().catch(() => null), path);
    return preview ? { state: "ok", preview } : { state: "busy" };
  } catch {
    return { state: "busy" };
  }
}

/** The origin a preview's own URLs use: wsww.app in production, the request's host elsewhere
    (a preview deploy, localhost). */
export function originOf(h: Headers): string {
  if (process.env.VERCEL_ENV === "production") return "https://wsww.app";
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim() === "http" || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https";
  return /^[A-Za-z0-9.-]+(:\d+)?$/.test(host) ? `${proto}://${host}` : "https://wsww.app";
}

/* The poster, fetched once per render and inlined (Satori would fetch it otherwise, with no
   timeout or size cap): the catalog CDN only (posterUrl), 3 s, 2 MB, JPEG or PNG. Anything else
   is the board's dashed frame with the real title (board 20, C "Posters"). */
const MAX_POSTER = 2_000_000;
export async function posterData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000) });
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!res.ok || !/^image\/(jpeg|png)$/.test(type)) return null;
    if (Number(res.headers.get("content-length") || 0) > MAX_POSTER || !res.body) return null;
    // Counted as it arrives: past 2 MB the read stops, whatever the headers said.
    const parts: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > MAX_POSTER) return null;
      parts.push(chunk);
    }
    const buf = Buffer.concat(parts);
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
