import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkEnabled } from "@/lib/clerk-enabled";

/* Everything is public except the owner's admin area. */
const isAdmin = createRouteMatcher(["/admin(.*)"]);

/* Without Clerk keys (local previews) the proxy is a no-op and /admin simply isn't protected. */
const withClerk = clerkMiddleware(async (auth, req) => {
  if (isAdmin(req)) await auth.protect();
});
export default clerkEnabled ? withClerk : () => undefined;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
