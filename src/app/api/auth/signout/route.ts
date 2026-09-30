import { NextResponse } from "next/server";
import { OWNER_COOKIE } from "@/lib/owner-session";

/* A POST, so a link or an image can't sign the owner out. */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(OWNER_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 }); // __Host- cookies clear only with the same flags
  return res;
}
