/* What Should We Watch film links (wsww.app/f/<token>): the shapes the API answers with, and the
   small pure helpers the page, its proxy routes and its preview card share. Safe for the browser:
   nothing here reads the environment. The API contract is the app repo's "Taste together, Phase 1:
   API contract" (Public section). */

/** secrets.token_urlsafe(16): 22 characters. Anything else is not a link we made. */
export const TOKEN = /^[A-Za-z0-9_-]{22}$/;
/** The page's random guest id, as the API accepts it. */
export const WEB_ID = /^[A-Za-z0-9_-]{8,64}$/;
/** Claim codes: six characters, no 0, O, 1, I or L. */
export const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

export const APP_STORE_URL = "https://apps.apple.com/app/id6814684533";

/** wsww.app's link pages (/f/ a sent film; /g/ and /j/ for later phases) carry a secret in the
    path: no site chrome, no telemetry. */
export const isPrivateLinkPath = (p: string) => /^\/(f|g|j)\//.test(p);

export const HUES = ["coral", "lilac", "lagoon", "butter", "moss", "sky"] as const;
export const SHAPES = ["round", "pebble", "drop", "bean", "tall", "squish"] as const;
export const FACES = ["smile", "grin", "calm", "wink", "curious", "thinking", "sleepy", "cheeky", "deadpan", "starry"] as const;
export type Hue = (typeof HUES)[number];
export type Avatar = { hue: Hue; shape: (typeof SHAPES)[number]; face: (typeof FACES)[number]; duo?: Hue | null };

export type Film = { id: string; title: string; year: number | null; runtimeMin: number | null; service: string; link: string | null; posterUrl: string | null };
export type FilmLink = { film: Film; from: { firstName: string; avatar: Avatar | null }; note: string | null; country: string };
export type Reaction = "liked" | "okay" | "not_for_me";
export const REACTIONS: Reaction[] = ["liked", "okay", "not_for_me"];

// The app's service ids → display names (apps/mobile/src/design/data.ts, SERVICES).
const SERVICES: Record<string, string> = {
  netflix: "Netflix", hulu: "Hulu", max: "Max", disney: "Disney+", apple: "Apple TV+", prime: "Prime Video", peacock: "Peacock",
  paramount: "Paramount+", criterion: "Criterion Channel", mubi: "MUBI", tubi: "Tubi", pluto: "Pluto TV", roku: "The Roku Channel", starz: "Starz",
  amc: "AMC+", shudder: "Shudder", kanopy: "Kanopy", hoopla: "Hoopla", britbox: "BritBox", acorn: "Acorn TV",
};
export const serviceName = (id: string): string | null => SERVICES[id] ?? null;

// The catalog is US-only for now (design answer 15: "on Netflix in the US").
const COUNTRIES: Record<string, string> = { us: "the US", gb: "the UK" };
export const countryName = (code: string) => COUNTRIES[code] ?? code.toUpperCase();

/** "1 h 43 m" / "34 m" / "2 h", like the app (apps/mobile/src/films.ts formatRuntime). */
export const formatRuntime = (m?: number | null): string => {
  if (!m || m < 1) return "";
  const h = Math.floor(m / 60), min = m % 60;
  return h ? (min ? `${h} h ${min} m` : `${h} h`) : `${min} m`;
};

/** "2017 · 1 h 43 m" */
export const yearAndRuntime = (f: Film) => [f.year ? String(f.year) : "", formatRuntime(f.runtimeMin)].filter(Boolean).join(" · ");

/** "on Netflix in the US", or "" when the service is not one the app knows. */
export const whereToWatch = (f: Film, country: string) => {
  const s = serviceName(f.service);
  return s ? `on ${s} in ${countryName(country)}` : "";
};

/** "2017 · 1 h 43 m · on Netflix in the US" (board 8: the redraw of S3 and the preview card). */
export const factsLine = (l: FilmLink) => [yearAndRuntime(l.film), whereToWatch(l.film, l.country)].filter(Boolean).join(" · ");

/** The sender as the page names them; a link without a name reads "Someone" (board 8, #6). */
export const senderName = (l: FilmLink) => l.from.firstName.trim() || "Someone";

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.slice(0, max) : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v > 0 && v < 100000 ? v : null);
const https = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
};
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => (list.includes(v as T) ? (v as T) : null);

/** The API's answer, kept only if it has the shape the page needs. Links must be https. */
export function parseFilmLink(body: unknown): FilmLink | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const f = b.film as Record<string, unknown> | undefined;
  const from = b.from as Record<string, unknown> | undefined;
  if (b.kind !== "f" || !f || !from) return null;
  const title = str(f.title, 200);
  const id = str(f.id, 64);
  const service = str(f.service, 32);
  if (!title || !id || !service) return null;
  const a = from.avatar as Record<string, unknown> | null | undefined;
  const hue = a && oneOf(HUES, a.hue);
  const shape = a && oneOf(SHAPES, a.shape);
  const face = a && oneOf(FACES, a.face);
  return {
    film: { id, title, year: int(f.year), runtimeMin: int(f.runtimeMin), service, link: https(f.link), posterUrl: https(f.posterUrl) },
    from: { firstName: typeof from.firstName === "string" ? from.firstName.slice(0, 40) : "", avatar: hue && shape && face ? { hue, shape, face, duo: oneOf(HUES, a?.duo) } : null },
    note: str(b.note, 280),
    country: typeof b.country === "string" && /^[a-z]{2}$/.test(b.country) ? b.country : "us",
  };
}
