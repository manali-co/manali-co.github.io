import "server-only";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkEnabled } from "./clerk-enabled";
import { OWNER_COOKIE, ownerEmails, readSession } from "./owner-session";

export type Owner = { name: string; email: string };

/* The admin area is for the owner only. First choice: the GitHub sign-in's signed cookie, whose
   email was verified by GitHub and is on ADMIN_EMAILS. Until Clerk is removed from the site, a
   Clerk sign-in with a *verified* email on the same list still counts (unverified addresses can be
   added to any Clerk account by anyone, so they never do). `user` is null when nobody is signed in. */
export async function requireOwner(): Promise<{ ok: boolean; user: Owner | null }> {
  const session = await readSession((await cookies()).get(OWNER_COOKIE)?.value);
  if (session) return { ok: true, user: { name: session.name, email: session.email } };
  if (!clerkEnabled) return { ok: false, user: null };
  const { userId } = await auth();
  if (!userId) return { ok: false, user: null };
  const user = await currentUser();
  const emails = (user?.emailAddresses || []).filter((e) => e.verification?.status === "verified").map((e) => e.emailAddress.toLowerCase());
  const allow = ownerEmails();
  return { ok: allow.length > 0 && emails.some((e) => allow.includes(e)), user: { name: user?.firstName || "", email: user?.emailAddresses?.[0]?.emailAddress || "" } };
}
