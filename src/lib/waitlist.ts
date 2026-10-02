import type { Metadata, Viewport } from "next";
import { projects, site } from "./site";

/* An app's page is its waitlist while every store entry is still "soon" (only What Should We Watch
   has one). Its metadata is the app's, not the blog's: the app's name, voice, icon and colours. */
type Project = (typeof projects)[number];
export const isWaitlist = (p: Project) => p.slug === "what-should-we-watch" && "stores" in p && !!p.stores?.every((st) => st.state === "soon");

const NAME = "What Should We Watch";
const TITLE = "What Should We Watch · Join the waitlist";
const DESCRIPTION =
  "The question everyone asks at 9pm, answered before 9:20. Pick a mood and get ten films that are actually streaming tonight, then swipe to decide. In App Store review now: join the waitlist for one email on launch day.";
const ICONS = "/apps/what-should-we-watch";
const URL = "/what-should-we-watch/";

export const waitlistMetadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  applicationName: NAME,
  keywords: ["what should we watch", "movie picker", "film recommendations", "what to watch tonight", "streaming", "mood", "iOS app", "waitlist"],
  alternates: { canonical: URL },
  icons: {
    icon: [{ url: `${ICONS}/favicon-32.png`, sizes: "32x32", type: "image/png" }, { url: `${ICONS}/icon-512.png`, sizes: "512x512", type: "image/png" }],
    apple: { url: `${ICONS}/apple-touch-icon-180.png`, sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    url: URL,
    siteName: site.name,
    locale: "en_US",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: `${ICONS}/icon-1024.png`, width: 1024, height: 1024, type: "image/png", alt: "What Should We Watch app icon: three overlapping mood discs in coral, lilac and lagoon" }],
  },
  // The share image is the square app icon, so the compact card, not the wide one.
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION, images: [`${ICONS}/icon-1024.png`] },
};

export const waitlistViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#17181B" },
  ],
};

/* Structured data: the app, who makes it, and the page it lives on. No offers or ratings until it
   is on the store. */
export const waitlistJsonLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: NAME,
  description: DESCRIPTION,
  url: `${site.url}${URL}`,
  image: `${site.url}${ICONS}/icon-1024.png`,
  operatingSystem: "iOS",
  applicationCategory: "EntertainmentApplication",
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};
