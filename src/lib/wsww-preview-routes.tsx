import { isWswwHost } from "./wsww-host";
import { cacheHeaders, copyFor, previewHtml, TOKEN, type LinkPath } from "./wsww-preview";
import { formatFor, NotDrawable, previewImage } from "./wsww-preview-image";
import { fetchPreview, originOf, posterData } from "./wsww-preview-server";

/* The two answers behind a shared link's preview (board 20):
   - the page a preview fetcher reads at wsww.app/add/<token> or /f/<token> (src/proxy.ts sends
     only fetchers here; a person's browser goes on to wsww.app as before), and
   - its image at /add/<token>/og.png and /f/<token>/og.png.
   Both read the API's preview call, which never acts on the token, and both are cached only as
   long as the API allows (an invite 60 s and never past its expiry). On manali.page, or when the
   API can't answer, there is no preview at all: a messenger then shows the bare URL. */

/* Previews answer on wsww.app only (and on preview deploys and localhost, for testing), and only
   for a well-formed token: nothing else gets a render. */
const served = (req: Request, token: string) =>
  TOKEN.test(token) && !new URL(req.url).search && (isWswwHost(req.headers) || process.env.VERCEL_ENV !== "production");

const none = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export async function previewImageResponse(req: Request, path: LinkPath, token: string): Promise<Response> {
  if (!served(req, token)) return none(404);
  const got = await fetchPreview(path, token, req.headers);
  if (got.state !== "ok") return none(503);
  const p = got.preview;
  const poster = p.kind === "film" ? await posterData(p.film.posterUrl) : null;
  try {
    return await previewImage(p, poster, cacheHeaders(p), formatFor(path));
  } catch (e) {
    if (e instanceof NotDrawable) return none(404);
    throw e;
  }
}

export async function previewPageResponse(req: Request, path: LinkPath, token: string): Promise<Response> {
  if (!served(req, token)) return none(404);
  const got = await fetchPreview(path, token, req.headers);
  if (got.state !== "ok") return none(503);
  const origin = originOf(req.headers);
  const safe = token;
  const url = `${origin}/${path}/${safe}`;
  // The image's URL carries the same token as the link itself, nothing more.
  const image = `${origin}/${path}/${safe}/${IMAGE_FILE[path]}`;
  return new Response(previewHtml(copyFor(got.preview), url, image, IMAGE_TYPE[path]), {
    status: 200,
    headers: { ...cacheHeaders(got.preview), "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Where each link's image lives: an invite's is PNG, a film's JPEG (its poster is a photo). */
export const IMAGE_FILE: Record<LinkPath, string> = { add: "og.png", f: "og.jpg" };
const IMAGE_TYPE: Record<LinkPath, string> = { add: "image/png", f: "image/jpeg" };

export const LINK_PATHS: readonly LinkPath[] = ["add", "f"];
