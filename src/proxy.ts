import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, readSession } from "@/lib/owner-session";

/* Everything is public except the owner's admin area, which needs the owner's GitHub sign-in (a
   signed cookie, see src/lib/owner-session.ts). Without it, /admin sends the visitor to /sign-in. */
export default async function proxy(req: NextRequest) {
  // wsww.app/privacy (no slash) would otherwise get this deployment's own /privacy page (the blog's),
  // which the platform serves before the host rewrite to the app's policy; send it to /privacy/.
  if (req.nextUrl.pathname === "/privacy") {
    const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
    return host === "wsww.app" ? NextResponse.redirect(new URL("/privacy/", req.url), 308) : undefined;
  }
  if (!req.nextUrl.pathname.startsWith("/admin")) return;
  if (!(await readSession(req.cookies.get(OWNER_COOKIE)?.value))) return NextResponse.redirect(new URL("/sign-in/", req.url));
}

/* Only the admin area (and wsww.app's bare /privacy) runs through here: readers never do, so no redirects for crawlers and curl and
   no auth cookies on the blog. The announce server action posts to /admin/, which is covered. */
export const config = { matcher: ["/admin(.*)", "/privacy"] };
