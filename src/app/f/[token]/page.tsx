import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLink, isManaliHost, originOf } from "@/lib/wsww-link-server";
import { factsLine, senderName } from "@/lib/wsww-link";
import { FilmLinkView } from "@/components/wsww/FilmLinkView";
import { LinkBusy, LinkUnavailable } from "@/components/wsww/LinkStates";

/* wsww.app/f/<token>: a film someone sent, for a phone without the app (or Android). Rendered on
   the server from the app API's public link read, so the film is in the first paint and the
   preview tags are in the HTML for chat apps. Private by default: never indexed, no referrer, no
   cache (next.config.ts sets the matching headers), no telemetry (Telemetry skips these paths).
   manali.page doesn't answer here: links are wsww.app's. */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

const ICONS = "/apps/what-should-we-watch";
const PRIVATE: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  icons: {
    icon: [{ url: `${ICONS}/favicon-32.png`, sizes: "32x32", type: "image/png" }],
    apple: { url: `${ICONS}/apple-touch-icon-180.png`, sizes: "180x180" },
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const h = await headers();
  if (isManaliHost(h)) return {};
  const r = await getLink(token);
  // No preview for a link that can't be shown (and not the blog's card the root would lend it).
  if (r.state !== "ok") return { ...PRIVATE, title: { absolute: "What Should We Watch" }, description: null, openGraph: { siteName: "What Should We Watch", images: [] }, twitter: { images: [] } };
  const { link } = r;
  const name = senderName(link);
  const url = `${originOf(h)}/f/${token}`;
  const facts = factsLine(link);
  const image = { url: `${url}/card`, width: 1200, height: 630, type: "image/png", alt: `${name} thinks you’d like this: ${link.film.title}. ${facts}` };
  return {
    ...PRIVATE,
    title: { absolute: `${name} sent you ${link.film.title}` },
    description: facts,
    openGraph: { type: "website", url, siteName: "What Should We Watch", title: link.film.title, description: facts, images: [image] },
    twitter: { card: "summary_large_image", title: link.film.title, description: facts, images: [image.url] },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#17181B" },
  ],
};

export default async function FilmLinkPage({ params }: Props) {
  const { token } = await params;
  if (isManaliHost(await headers())) notFound();
  const r = await getLink(token);
  if (r.state === "unavailable") return <LinkUnavailable />;
  if (r.state === "busy") return <LinkBusy />;
  return <FilmLinkView token={token} link={r.link} />;
}
