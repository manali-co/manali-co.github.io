import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/* Everything is public except the owner's admin area. */
const isAdmin = createRouteMatcher(["/admin(.*)"]);

/* Without Clerk keys (local previews) the proxy is a no-op and /admin simply isn't protected. */
const withClerk = clerkMiddleware(async (auth, req) => {
  if (isAdmin(req)) await auth.protect();
});
export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? withClerk : () => undefined;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
