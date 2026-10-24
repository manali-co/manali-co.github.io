import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, readSession } from "@/lib/owner-session";
import { isWswwHost } from "@/lib/wsww-host";

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
  if (/^\/(?:add|f)(?:\/|$)/.test(req.nextUrl.pathname)) {
    if (!isWswwHost(req.headers)) return;
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
