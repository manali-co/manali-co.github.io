import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, readSession } from "@/lib/owner-session";
import { isManaliHost, isWswwHost } from "@/lib/wsww-host";

/* A film link page carries a secret (the token) in its address: no referrer leaves it (fonts,
   posters, the store, the service), it is never indexed and never cached. Set here, not in
   next.config's headers, so they reach only a person's page (site #43's preview fetchers get their
   own cacheable answer at the same URL). The answer routes (/api/links/) get theirs in next.config. */
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
  // universal links (src/app/.well-known/apple-app-site-association). Without the app:
  // - /f/<token> is the film's own page (src/app/f/[token]), and /f/<token>/card its preview image.
  //   One path segment reaches the page whatever it holds, so a cut-off link gets the page's "This
  //   link isn't available." rather than a silent trip home. The page is private: the headers below.
  // - /add/<token> has no page yet: wsww.app's home page and its App Store button instead of a 404.
  //   The token and any query stay behind; a 307, never cached, so a page can take over later. So do
  //   /f/ alone and any deeper /f/ path.
  // On manali.page none of these answer (the page itself 404s there too).
  const path = req.nextUrl.pathname;
  const film = /^\/f\/(?:[^/]+|[A-Za-z0-9_-]{22}\/card)\/?$/.test(path);
  if (film && !isManaliHost(req.headers)) {
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(PRIVATE_LINK_HEADERS)) res.headers.set(k, v);
    return res;
  }
  if (/^\/(?:add|f)(?:\/|$)/.test(path)) {
    if (!isWswwHost(req.headers)) return;
    const res = NextResponse.redirect("https://wsww.app/", 307);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (!req.nextUrl.pathname.startsWith("/admin")) return;
  if (!(await readSession(req.cookies.get(OWNER_COOKIE)?.value))) return NextResponse.redirect(new URL("/sign-in/", req.url));
}

/* Only the admin area (and wsww.app's bare /privacy, its /add/ and /f/ links) runs through here: readers never do, so no redirects for crawlers and curl and
   no auth cookies on the blog. The announce server action posts to /admin/, which is covered. */
export const config = { matcher: ["/admin(.*)", "/privacy", "/add/:path*", "/f/:path*"] };
