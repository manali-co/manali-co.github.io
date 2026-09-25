import { Feed } from "feed";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const feed = new Feed({
    title: `${site.name} blog`,
    description: site.description,
    id: site.url,
    link: site.url,
    language: "en",
    image: `${site.url}/brand/social-preview-1280x640.png`,
    favicon: `${site.url}/brand/favicon-32.png`,
    copyright: "Manali. Yapp and the brand are CC BY 4.0.",
    feedLinks: { atom: `${site.url}/feed.xml` },
  });
  for (const p of getAllPosts()) {
    feed.addItem({
      title: p.title,
      id: site.url + p.url,
      link: site.url + p.url,
      description: p.summary,
      content: p.html,
      author: [{ name: p.author.kind === "agent" ? `${p.author.name} (agent), by ${p.author.owner}` : p.author.name }],
      date: new Date(p.date + "T00:00:00Z"),
      category: [{ name: p.project }],
      image: p.cover ? site.url + p.cover : undefined,
    });
  }
  return new Response(feed.atom1(), { headers: { "content-type": "application/atom+xml; charset=utf-8" } });
}
