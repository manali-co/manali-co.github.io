import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { githubAuthEnabled, OWNER_COOKIE, ownerEmails, SESSION_DAYS, sameState, signSession, STATE_COOKIE } from "@/lib/owner-session";

/* Step two: GitHub sends the visitor back with a one-time code. Check the state, trade the code for
   a token, read the verified emails, and only if one is on ADMIN_EMAILS set the owner cookie. The
   token is dropped right here. Anyone else gets a plain "not the owner" and no session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (error: string) => {
    const res = NextResponse.redirect(`${url.origin}/sign-in/?error=${error}`);
    res.cookies.set(STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 }); // __Host- cookies clear only with the same flags
    return res;
  };
  if (!githubAuthEnabled()) return back("off");
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const expected = (await cookies()).get(STATE_COOKIE)?.value || "";
  if (!code || !state || !expected || !sameState(state, expected)) return back("expired");

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ client_id: process.env.AUTH_GITHUB_ID, client_secret: process.env.AUTH_GITHUB_SECRET, code, redirect_uri: `${url.origin}/api/auth/callback/github` }),
      cache: "no-store",
    });
    const { access_token: token } = (await tokenRes.json()) as { access_token?: string };
    if (!token) return back("github");
    const gh = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "manali.page" };
    const [userRes, emailRes] = await Promise.all([fetch("https://api.github.com/user", { headers: gh, cache: "no-store" }), fetch("https://api.github.com/user/emails", { headers: gh, cache: "no-store" })]);
    if (!userRes.ok || !emailRes.ok) return back("github");
    const user = (await userRes.json()) as { login: string; name?: string | null };
    const emails = (await emailRes.json()) as { email: string; verified: boolean }[];
    const allow = ownerEmails();
    const owner = emails.find((e) => e.verified && allow.includes(e.email.toLowerCase()));
    if (!owner) return back("not-owner");

    const res = NextResponse.redirect(`${url.origin}/admin/`);
    res.cookies.set(OWNER_COOKIE, await signSession({ login: user.login, name: user.name || user.login, email: owner.email }), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400,
    });
    res.cookies.set(STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 }); // __Host- cookies clear only with the same flags
    return res;
  } catch {
    return back("github");
  }
}
