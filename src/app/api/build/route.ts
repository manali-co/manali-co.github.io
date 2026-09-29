/* Which deploy is live. StaleTabGuard compares this with the build its tab was loaded from. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ build: process.env.VERCEL_DEPLOYMENT_ID || "" }, { headers: { "cache-control": "no-store" } });
}
