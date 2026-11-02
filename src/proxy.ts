import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, readSession } from "@/lib/owner-session";
import { isManaliHost, isWswwHost } from "@/lib/wsww-host";
import { isPreviewBot } from "@/lib/wsww-preview";

/* A film link page carries a secret (the token) in its address: no referrer leaves it (fonts,
   posters, the store, the service), it is never indexed and never cached. Set here, not in
   next.config's headers, so they reach only a person's page (the preview fetchers get their own
   cacheable answer at the same URL). The answer routes (/api/links/) get theirs in next.config. */
const PRIVATE_LINK_HEADERS = { "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

/* Everything is public except the owner's admin area, which needs the owner's GitHub sign-in (a
   signed cookie, see src/lib/owner-session.ts). Without it, /admin sends the visitor to /sign-in. */
export default async function proxy(req: NextRequest) {
  // wsww.app/privacy (no slash) would otherwise get this deployment's own /privacy page (the blog's),
  // which the platform serves before the host rewrite to the app's policy; send it to /privacy/.
  if (req.nextUrl.pathname === "/privacy") {
    const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
    return host === "wsww.app" ? NextResponse.redirect(new URL("/privacy/", req.url), 308) : undefined;
  }
  // wsww.app/add/<token> (a friend invite) and /f/<token> (a film someone sent) open the app through
  // universal links (src/app/.well-known/apple-app-site-association). Until their own pages exist, a
  // phone without the app lands on wsww.app's home page and its App Store button instead of a 404.
  // The token and any query stay behind; a 307, never cached, so those pages can take over later.
  // Link previews (board 20): the preview image (/add/<token>/og.png, /f/<token>/og.jpg) is served as is, and a
  // messenger's preview fetcher reads the link's own preview page instead of the home page's, so
  // an invite, a film and an expired link each look like what they are. A person never sees it.
  const link = /^\/(add|f)(?:\/([A-Za-z0-9_-]{22}))?(\/og\.(?:png|jpg))?\/?$/.exec(req.nextUrl.pathname);
  // A query would make every request a new cache key (and a new render): the image has none.
  if (link?.[3] && link[2]) return req.nextUrl.search ? new NextResponse(null, { status: 404 }) : NextResponse.next();
  if (/^\/(?:add|f)(?:\/|$)/.test(req.nextUrl.pathname)) {
    const wsww = isWswwHost(req.headers);
    if (wsww && link?.[2] && !link[3] && isPreviewBot(req.headers.get("user-agent"))) {
      // The rewrite drops any query (utm_… from a share sheet), so one link is one cache entry.
      return NextResponse.rewrite(new URL(`/wsww-link-preview/${link[1]}/${link[2]}/`, req.nextUrl.origin));
    }
    // A person's browser: /f/<token> is the film's own page (src/app/f/[token]); one path segment
    // reaches it whatever it holds, so a cut-off link gets "This link isn't available." rather than a
    // silent trip home. /f/<token>/card is its old preview image. /add/<token> has no page yet, and
    // /f/ alone or any deeper /f/ path, go home below.
    if (/^\/f\/(?:[^/]+|[A-Za-z0-9_-]{22}\/card)\/?$/.test(req.nextUrl.pathname) && !isManaliHost(req.headers)) {
      const page = NextResponse.next();
      for (const [k, v] of Object.entries(PRIVATE_LINK_HEADERS)) page.headers.set(k, v);
      return page;
    }
    if (!wsww) return;
    const res = NextResponse.redirect("https://wsww.app/", 307);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (!req.nextUrl.pathname.startsWith("/admin")) return;
  if (!(await readSession(req.cookies.get(OWNER_COOKIE)?.value))) return NextResponse.redirect(new URL("/sign-in/", req.url));
}

/* Only the admin area (and wsww.app's bare /privacy, /add/ and /f/) runs through here: readers never do, so no redirects for crawlers and curl and
   no auth cookies on the blog. The announce server action posts to /admin/, which is covered. */
export const config = { matcher: ["/admin(.*)", "/privacy", "/add/:path*", "/f/:path*"] };
