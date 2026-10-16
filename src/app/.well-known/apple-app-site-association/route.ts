import { isManaliHost } from "@/lib/wsww-link-server";

/* Universal links for What Should We Watch on wsww.app: iOS reads this (through Apple's CDN) to
   open /f/ (a sent film) in the app when it's installed. /g/ (group invites) and /j/ (joining a
   room) are claimed now for later phases, so a native build with the associated domain doesn't
   need this file to change again. Served as JSON at exactly this path, no extension, no redirect.
   manali.page has no associated app, so it doesn't answer. */

export const dynamic = "force-dynamic";

const AASA = {
  applinks: {
    details: [
      {
        appIDs: ["W6RL988KTP.co.manali.wsww"],
        components: [
          { "/": "/f/*", comment: "A film someone sent" },
          { "/": "/g/*", comment: "A group invite (later phase)" },
          { "/": "/j/*", comment: "Joining a room (later phase)" },
        ],
      },
    ],
  },
};

export function GET(req: Request) {
  if (isManaliHost(req.headers)) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(AASA), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
