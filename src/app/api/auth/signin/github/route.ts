import { NextResponse } from "next/server";
import { githubAuthEnabled, randomState, STATE_COOKIE } from "@/lib/owner-session";

/* Step one of the owner's GitHub sign-in: a random state in a short-lived cookie, then off to
   GitHub. Only read:user and user:email are asked for, just enough to check a verified email. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!githubAuthEnabled()) return NextResponse.redirect(`${origin}/sign-in/?error=off`);
  const state = randomState();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.AUTH_GITHUB_ID!,
    redirect_uri: `${origin}/api/auth/callback/github`,
    scope: "read:user user:email",
    state,
    allow_signup: "false",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
