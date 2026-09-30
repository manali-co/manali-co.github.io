import { getPublicSeries, getSeries } from "@/lib/series";
import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-static";
export const alt = "manali apps";

export function generateStaticParams() {
  return getPublicSeries().map((s) => ({ slug: s.slug }));
}

/* The card shown when a series hub is shared: the design system's SocialCard kind="series". */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const s = getSeries((await params).slug);
  if (!s) return ogImage({ title: "manali apps" });
  return ogImage({ title: s.title, project: s.project, series: s.parts.map((p) => ({ soon: p.state === "upcoming" })) });
}
