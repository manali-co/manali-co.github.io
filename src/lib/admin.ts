import { auth, currentUser } from "@clerk/nextjs/server";

/* The admin area is for the owner only: a Clerk sign-in whose email is on the allowlist. */
export async function requireOwner() {
  await auth.protect();
  const user = await currentUser();
  const emails = (user?.emailAddresses || []).map((e) => e.emailAddress.toLowerCase());
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const ok = allow.length > 0 && emails.some((e) => allow.includes(e));
  return { ok, user };
}
