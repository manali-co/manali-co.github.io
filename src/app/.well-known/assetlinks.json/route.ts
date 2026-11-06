import { isManaliHost } from "@/lib/wsww-host";

/* Android App Links for What Should We Watch on wsww.app: Android reads this to open /add/ and /f/ in
   the app when it's installed, as apple-app-site-association does on iOS. The fingerprint is Play App
   Signing's key (Play Console, App signing), the one installed copies are signed with. manali.page
   has no associated app, so it doesn't answer. */

export const dynamic = "force-dynamic";

const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "co.manali.wsww",
      sha256_cert_fingerprints: ["11:AE:24:C4:8D:E7:C3:76:98:F7:59:1C:8B:01:1C:19:0D:00:0F:C3:31:D7:C4:75:A5:C0:5F:70:70:E7:3C:0E"],
    },
  },
];

export function GET(req: Request) {
  if (isManaliHost(req.headers)) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(ASSET_LINKS), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
