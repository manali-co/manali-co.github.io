import { NextResponse } from "next/server";

/* The confirmation email links here; we hand the token to the backend, which redirects back. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const base = process.env.API_BASE_URL;
  if (!base || !token) return NextResponse.redirect(new URL("/subscribe/?confirmed=0", req.url));
  return NextResponse.redirect(`${base}/confirm?token=${encodeURIComponent(token)}`);
}
