import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkEnabled } from "@/lib/clerk-enabled";

/* Everything is public except the owner's admin area. */
const isAdmin = createRouteMatcher(["/admin(.*)"]);

/* Without Clerk keys (local previews) the proxy is a no-op and /admin simply isn't protected. */
const withClerk = clerkMiddleware(async (auth, req) => {
  if (isAdmin(req)) await auth.protect();
});
export default clerkEnabled ? withClerk : () => undefined;

/* Only the owner's routes go through Clerk. Readers never touch it: no handshake redirect for
   crawlers and curl, no Clerk cookies on the blog, and a smaller surface. The announce server
   action posts to /admin/, which is covered. */
export const config = {
  matcher: ["/admin(.*)", "/sign-in(.*)", "/__clerk/(.*)"],
};
