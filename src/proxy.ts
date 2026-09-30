import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, readSession } from "@/lib/owner-session";

/* Everything is public except the owner's admin area, which needs the owner's GitHub sign-in (a
   signed cookie, see src/lib/owner-session.ts). Without it, /admin sends the visitor to /sign-in. */
export default async function proxy(req: NextRequest) {
  if (!(await readSession(req.cookies.get(OWNER_COOKIE)?.value))) return NextResponse.redirect(new URL("/sign-in/", req.url));
}

/* Only the admin area runs through here: readers never do, so no redirects for crawlers and curl and
   no auth cookies on the blog. The announce server action posts to /admin/, which is covered. */
export const config = { matcher: ["/admin(.*)"] };
