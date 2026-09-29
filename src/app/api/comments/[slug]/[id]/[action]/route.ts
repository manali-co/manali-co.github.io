import { bad, CID, CLIENT, forward, jsonBody, SLUG, str } from "@/lib/api-proxy";

/* love: toggle this browser's love on a comment. notify: the author turns reply emails on or off. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string; action: string }> }) {
  const { slug, id, action } = await params;
  const b = await jsonBody(req);
  const client = b ? str(b.client, 64) : "";
  if (!SLUG.test(slug) || !CID.test(id) || !CLIENT.test(client) || !["love", "notify"].includes(action)) return bad();
  const body = action === "notify" ? { client, notify: b!.notify === true } : { client };
  return forward(`/comments/${slug}/${id}/${action}`, { method: "POST", body: JSON.stringify(body) });
}
