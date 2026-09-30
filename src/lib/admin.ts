import "server-only";
import { cookies } from "next/headers";
import { OWNER_COOKIE, readSession } from "./owner-session";

export type Owner = { name: string; email: string };

/* The admin area is for the owner only: a GitHub sign-in whose verified email is on ADMIN_EMAILS,
   kept as a signed cookie and re-checked against the list on every request. */
export async function requireOwner(): Promise<{ ok: boolean; user: Owner | null }> {
  const session = await readSession((await cookies()).get(OWNER_COOKIE)?.value);
  return session ? { ok: true, user: { name: session.name, email: session.email } } : { ok: false, user: null };
}
