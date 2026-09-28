import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { projects, site } from "@/lib/site";
import { FILTERS } from "@/components/NotesView";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latest = posts[0]?.date;
  return [
    { url: `${site.url}/`, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/blog/`, lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    ...posts.map((p) => ({ url: `${site.url}${p.url}`, lastModified: p.date, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...projects.map((p) => ({ url: `${site.url}/${p.slug}/`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...FILTERS.filter((f) => f !== "all").map((f) => ({ url: `${site.url}/blog/project/${f}/`, changeFrequency: "weekly" as const, priority: 0.4 })),
    { url: `${site.url}/subscribe/`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
