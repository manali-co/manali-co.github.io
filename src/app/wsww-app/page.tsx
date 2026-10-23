import type { Metadata, Viewport } from "next";
import { WsswHome } from "@/components/WsswHome";
import { WSWW } from "@/lib/site";

/* wsww.app's home page. It lives at /wsww-app/ in this deployment and is served at the root of
   wsww.app by a host-matched rewrite (next.config.ts); manali.page/wsww-app/ redirects there. */

const TITLE = "What Should We Watch";
const DESCRIPTION =
  "Pick a mood or two and get ten films that are on your services tonight. Swipe, and get one verdict. Free on the App Store for iPhone.";
const ICONS = "/apps/what-should-we-watch";

export const metadata: Metadata = {
  metadataBase: new URL(WSWW.home),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  applicationName: TITLE,
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: `${ICONS}/favicon-32.png`, sizes: "32x32", type: "image/png" }, { url: `${ICONS}/icon-512.png`, sizes: "512x512", type: "image/png" }],
    apple: { url: `${ICONS}/apple-touch-icon-180.png`, sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: TITLE,
    locale: "en_US",
    title: "What should we watch?",
    description: DESCRIPTION,
    images: [{ url: `${ICONS}/icon-1024.png`, width: 1024, height: 1024, type: "image/png", alt: "What Should We Watch app icon: three overlapping mood discs in coral, lilac and lagoon" }],
  },
  twitter: { card: "summary", title: "What should we watch?", description: DESCRIPTION, images: [`${ICONS}/icon-1024.png`] },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#17181B" },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: TITLE,
  description: DESCRIPTION,
  url: WSWW.home,
  image: `${WSWW.home}${ICONS}/icon-1024.png`,
  operatingSystem: "iOS",
  applicationCategory: "EntertainmentApplication",
  installUrl: WSWW.appStore,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: "Manali", url: "https://manali.page" },
};

export default function WsswAppHome() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WsswHome storeUrl={WSWW.appStore} />
    </>
  );
}
