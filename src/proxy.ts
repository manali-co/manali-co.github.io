import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { OWNER_COOKIE, readSession } from "@/lib/owner-session";

/* Everything is public except the owner's admin area. The owner's GitHub sign-in (a signed cookie)
   lets /admin through directly; without it, Clerk still guards /admin while it's being retired, and
   with no Clerk either, the visitor goes to /sign-in. */
const isAdmin = createRouteMatcher(["/admin(.*)"]);
const ownerSignedIn = async (req: NextRequest) => !!(await readSession(req.cookies.get(OWNER_COOKIE)?.value));

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isAdmin(req) && !(await ownerSignedIn(req))) await auth.protect();
});
async function withoutClerk(req: NextRequest) {
  if (isAdmin(req) && !(await ownerSignedIn(req))) return NextResponse.redirect(new URL("/sign-in/", req.url));
}
export default clerkEnabled ? withClerk : withoutClerk;

/* Only the owner's routes go through here. Readers never do: no redirects for crawlers and curl, no
   auth cookies on the blog, and a smaller surface. The announce server action posts to /admin/,
   which is covered. */
export const config = {
  matcher: ["/admin(.*)", "/sign-in(.*)", "/__clerk/(.*)"],
};
