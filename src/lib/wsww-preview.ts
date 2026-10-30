/* Link previews for wsww.app's shared links (Claude Design, What Should We Watch, board 20 "Link
   previews" and its component "Link preview"): what iMessage, WhatsApp and Instagram DMs draw when
   someone pastes wsww.app/add/<token> (a friend invite) or wsww.app/f/<token> (a film).

   The preview fetch is a GET by Apple's, Meta's or WhatsApp's servers (or the sender's phone): it
   must never act on the token (board 20, "Bots don't act"). The API's preview call is a read and
   nothing else (POST /v1/public/links/preview): it never claims, opens, counts or extends a link.

   The copy is the board's table A, word for word, with one correction: the board says a link to
   add a friend lasts 15 minutes; it lasts 7 days (ADR 0004; 15 minutes is the claim code's life). */

export const TOKEN = /^[A-Za-z0-9_-]{22}$/;
export const SITE_NAME = "What Should We Watch";
export const OG_SIZE = { width: 1200, height: 630 };
const ADD_LINK_LIFE = "7 days";

export type Disco = { hue: string; shape: string };
export type Person = { firstName: string; avatar: Disco | null };
export type Preview =
  | { kind: "invite"; from: Person; expiresAt: number; maxAgeS: number }
  | { kind: "film"; film: { title: string; year: number | null; posterUrl: string | null }; from: Person | null; pitch: string | null; maxAgeS: number }
  | { kind: "expired"; from: Person | null; maxAgeS: number }
  | { kind: "missing"; maxAgeS: number }
  // Group picks (board 7 I2, wsww.app/g/<id>) have no link in the API yet (group mode, #26):
  // the image and copy are here so the route only has to read one when it exists.
  | { kind: "group"; from: Person; group: string; members: Person[]; maxAgeS: number }
  | { kind: "withdrawn"; group: string; maxAgeS: number };

/** The link kinds a path can carry. */
export type LinkPath = "add" | "f";

const HUES = new Set(["coral", "lilac", "lagoon", "butter", "moss", "sky"]);
const SHAPES = new Set(["round", "pebble", "drop", "bean", "tall", "squish"]);
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function person(v: unknown): Person | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const firstName = str(o.firstName, 24);
  if (!firstName) return null;
  const a = o.avatar && typeof o.avatar === "object" ? (o.avatar as Record<string, unknown>) : null;
  const avatar = a && HUES.has(String(a.hue)) ? { hue: String(a.hue), shape: SHAPES.has(String(a.shape)) ? String(a.shape) : "round" } : null;
  return { firstName, avatar };
}

const age = (v: unknown, cap: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(cap, Math.floor(v))) : 0);

/** The API's answer, checked field by field: anything unexpected is a missing link, never shown. */
export function parsePreview(raw: unknown, path: LinkPath): Preview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const maxAgeS = age(o.maxAgeS, 300);
  switch (o.kind) {
    case "invite": {
      const from = person(o.from);
      if (path !== "add") return { kind: "missing", maxAgeS };
      return from && typeof o.expiresAt === "number" ? { kind: "invite", from, expiresAt: o.expiresAt, maxAgeS: Math.min(maxAgeS, 60) } : { kind: "expired", from: null, maxAgeS: 60 };
    }
    case "expired":
      return path === "add" ? { kind: "expired", from: person(o.from), maxAgeS: Math.min(maxAgeS, 60) } : { kind: "missing", maxAgeS };
    case "film": {
      const f = o.film && typeof o.film === "object" ? (o.film as Record<string, unknown>) : null;
      const title = f && str(f.title, 200);
      if (path !== "f") return { kind: "expired", from: null, maxAgeS: 60 };
      if (!f || !title) return { kind: "missing", maxAgeS };
      const year = typeof f.year === "number" && Number.isInteger(f.year) ? f.year : null;
      return { kind: "film", film: { title, year, posterUrl: posterUrl(f.posterUrl) }, from: person(o.from), pitch: str(o.pitch, 140), maxAgeS };
    }
    case "missing":
      return path === "add" ? { kind: "expired", from: null, maxAgeS: 60 } : { kind: "missing", maxAgeS };
    default:
      return null;
  }
}

/* The poster is fetched here, so only the catalog's CDN (the API passes nothing else) and only
   over https on the default port. */
const POSTER_HOSTS = new Set(["cdn.movieofthenight.com"]);
export function posterUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 1000) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && POSTER_HOSTS.has(u.hostname) && !u.port && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

/* Text limits (board 20, C): names over 18 characters and pitches over 120 are cut by the server
   before layout, with an ellipsis. */
export function cut(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : s;
}
export const nameOf = (p: Person | null) => (p ? cut(p.firstName, 18) : "");

/** "Manali, Jo and Sam"; four or more: "Manali, Jo and 3 others" (board 20, table A). */
export function names(people: Person[]): string {
  const n = people.map(nameOf);
  if (n.length <= 1) return n[0] || "";
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  if (n.length === 3) return `${n[0]}, ${n[1]} and ${n[2]}`;
  return `${n[0]}, ${n[1]} and ${n.length - 2} others`;
}

export type Copy = {
  /** og:title and the page title. */ title: string;
  /** og:description. */ description: string;
  /** The image's heading and line; og:image:alt is the two together. */ heading: string; line: string;
  alt: string;
};

/** Board 20, table A ("The copy · og:title · og:description · exact"). */
export function copyFor(p: Preview): Copy {
  const make = (title: string, description: string, heading: string, line: string): Copy => ({ title, description, heading, line, alt: `${heading}. ${line}` });
  switch (p.kind) {
    case "invite": {
      const n = nameOf(p.from);
      return make(`${n} wants to be friends on ${SITE_NAME}`, `Tap to add ${n}. You’ll send each other films and hear how they landed. The link works for ${ADD_LINK_LIFE}.`, `${n} wants to be friends`, `Tap to add ${n} on ${SITE_NAME}.`);
    }
    case "film": {
      const t = p.film.year ? `${p.film.title} (${p.film.year})` : p.film.title;
      const n = nameOf(p.from);
      if (p.pitch && n) {
        const q = `“${cut(p.pitch, 120)}”`;
        return make(t, `${q} ${n} sent it on ${SITE_NAME}.`, p.film.title, `${q} ${n}`);
      }
      const line = n ? `${n} sent you this on ${SITE_NAME}.` : `On ${SITE_NAME}.`;
      return make(t, line, p.film.title, line);
    }
    case "group": {
      const n = nameOf(p.from);
      const who = names(p.members);
      return make(`${n} asked you into ${p.group}`, `Pick films with ${who} on ${SITE_NAME}. Works without the app · 7 days.`, `${n} asked you into ${p.group}`, `Pick films with ${who}. Works without the app.`);
    }
    case "expired": {
      const n = nameOf(p.from);
      const line = n ? `Ask ${n} for a new one. A link to add a friend lasts ${ADD_LINK_LIFE}.` : `A link to add a friend lasts ${ADD_LINK_LIFE}.`;
      return make("This link has expired", line, "This link has expired", line);
    }
    case "withdrawn":
      return make("This invitation was withdrawn", "Ask someone in the group for a new link.", "This invitation was withdrawn", "Ask someone in the group for a new link.");
    case "missing":
      return make("This film isn’t here any more", `It may have left the catalogue. Open ${SITE_NAME} to find something like it.`, "This film isn’t here any more", `It may have left the catalogue. Open ${SITE_NAME} to find something like it.`);
  }
}

/* Board 20, "Expiry wins": an invite is cached 60 s at most and never past its expiry; what the
   API says for the rest (a film 300 s: its sender can take the note or the film back). */
export function cacheSeconds(p: Preview, nowS = Math.floor(Date.now() / 1000)): number {
  if (p.kind === "invite") return Math.max(0, Math.min(60, p.maxAgeS, p.expiresAt - nowS));
  return p.maxAgeS;
}

export function cacheHeaders(p: Preview): Record<string, string> {
  const s = cacheSeconds(p);
  const cc = s > 0 ? `public, max-age=${s}, s-maxage=${s}` : "no-store";
  return { "Cache-Control": cc, "CDN-Cache-Control": cc, "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };
}

/* Link-preview fetchers by their user agents. iMessage's preview (from the sender's phone) says
   "facebookexternalhit/1.1 Facebot Twitterbot/1.0"; Instagram's and Facebook's say
   facebookexternalhit; WhatsApp's says WhatsApp/<version>. Only these get the preview page: a
   person's browser still goes to wsww.app's home page (and the App Store) until the link pages
   themselves ship, so nothing a person sees changes. */
const PREVIEW_BOTS = /facebookexternalhit|facebookcatalog|Facebot|Twitterbot|WhatsApp|TelegramBot|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|redditbot|Pinterestbot|Snap URL Preview|Google-PageRenderer|Iframely|Embedly|vkShare|Mastodon|Bluesky|Cardyb/i;
export const isPreviewBot = (ua: string | null) => !!ua && PREVIEW_BOTS.test(ua);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** The page a preview fetcher reads: the board's og and twitter tags, nothing to run. */
export function previewHtml(c: Copy, url: string, image: string, imageType = "image/png"): string {
  const meta = (attr: "property" | "name", key: string, value: string) => `<meta ${attr}="${key}" content="${esc(value)}">`;
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    `<title>${esc(c.title)}</title>`,
    meta("name", "description", c.description),
    meta("name", "robots", "noindex, nofollow"),
    meta("name", "referrer", "no-referrer"),
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:title", c.title),
    meta("property", "og:description", c.description),
    meta("property", "og:url", url),
    meta("property", "og:image", image),
    meta("property", "og:image:type", imageType),
    meta("property", "og:image:width", String(OG_SIZE.width)),
    meta("property", "og:image:height", String(OG_SIZE.height)),
    meta("property", "og:image:alt", c.alt),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", c.title),
    meta("name", "twitter:description", c.description),
    meta("name", "twitter:image", image),
    meta("name", "twitter:image:alt", c.alt),
    `</head><body><p>${esc(c.title)}</p><p>${esc(c.description)}</p><p><a href="https://wsww.app/">${SITE_NAME}</a></p></body></html>`,
  ].join("\n");
}

/** The same tags as Next metadata, for the link pages themselves when they ship (their
    generateMetadata returns this, so a person's page and a fetcher's agree). */
export function previewMetadata(c: Copy, url: string, image: string, imageType = "image/png") {
  return {
    title: c.title,
    description: c.description,
    robots: { index: false, follow: false },
    referrer: "no-referrer" as const,
    openGraph: { type: "website" as const, siteName: SITE_NAME, title: c.title, description: c.description, url, images: [{ url: image, type: imageType, width: OG_SIZE.width, height: OG_SIZE.height, alt: c.alt }] },
    twitter: { card: "summary_large_image" as const, title: c.title, description: c.description, images: [{ url: image, alt: c.alt }] },
  };
}
