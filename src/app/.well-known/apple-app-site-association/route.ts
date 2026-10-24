import { isManaliHost } from "@/lib/wsww-host";

/* Universal links for What Should We Watch on wsww.app: iOS reads this (through Apple's CDN) to open
   /add/ (a friend invite) and /f/ (a film someone sent) in the app when it's installed. Served as
   JSON at exactly this path, no extension, no redirect. manali.page has no associated app, so it
   doesn't answer. Only claim a path once the app handles it: iOS hands a claimed URL to the app
   instead of the browser. */

export const dynamic = "force-dynamic";

const AASA = {
  applinks: {
    details: [
      {
        appIDs: ["W6RL988KTP.co.manali.wsww"],
        components: [
          { "/": "/add/*", comment: "A friend invite" },
          { "/": "/f/*", comment: "A film someone sent" },
        ],
      },
    ],
  },
};

export function GET(req: Request) {
  if (isManaliHost(req.headers)) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(AASA), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
