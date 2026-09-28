import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkEnabled } from "./clerk-enabled";

/* The admin area is for the owner only: a Clerk sign-in with a *verified* email on the allowlist.
   Unverified addresses can be added to any Clerk account by anyone, so they never count. */
export async function requireOwner() {
  if (!clerkEnabled) return { ok: false, user: null };
  await auth.protect();
  const user = await currentUser();
  const emails = (user?.emailAddresses || [])
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const ok = allow.length > 0 && emails.some((e) => allow.includes(e));
  return { ok, user };
}
