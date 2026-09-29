import { bad, CID, CLIENT, forward, jsonBody, SLUG, str } from "@/lib/api-proxy";

/* Public comments for a post. The browser's id travels in a header or the body, never a URL. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug)) return bad();
  const client = req.headers.get("x-client") || "";
  return forward(`/comments/${slug}`, {}, CLIENT.test(client) ? { "x-client": client } : {});
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await jsonBody(req);
  if (!SLUG.test(slug) || !b) return bad();
  const client = str(b.client, 64), text = str(b.text, 2000).trim(), parent = str(b.parent, 40);
  if (!CLIENT.test(client) || !text || (parent && !CID.test(parent))) return bad();
  const body = { client, text, parent, name: str(b.name, 40), email: str(b.email, 254), notify: b.notify === true, title: str(b.title, 200) };
  return forward(`/comments/${slug}`, { method: "POST", body: JSON.stringify(body) });
}
