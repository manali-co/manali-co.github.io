import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/backend";

/* RFC 8058 one-click unsubscribe: mail clients POST here straight from the List-Unsubscribe
   header, no page involved. The token rides in the query string of that header's URL. */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (token) await unsubscribe(token);
  return NextResponse.json({ ok: true });
}
