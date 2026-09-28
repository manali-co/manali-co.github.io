import { getAllPosts, getPost, readableDate } from "@/lib/posts";
import { projectLabel } from "@/lib/site";
import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

/* alt text per post, so a shared card reads as the post and not as the site */
export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return [{ id: "card", size: OG_SIZE, contentType: "image/png", alt: post ? `${post.title} · manali apps` : "manali apps" }];
}

/* The card social networks show when a post is shared. Generated from the post at build time. */
export default async function Image({ params }: { params: Promise<{ slug: string }>; id?: string }) {
  const post = getPost((await params).slug);
  if (!post) return ogImage({ title: "manali apps" });
  const label = post.project === "manali" ? "manali apps" : projectLabel[post.project];
  const who = post.author.kind === "agent" ? `${post.author.name} for ${label}, by ${post.author.owner}` : post.author.name;
  return ogImage({ title: post.title, project: post.project, byline: `${who} · ${readableDate(post.date)}` });
}
