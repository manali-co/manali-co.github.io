import type { Metadata, Viewport } from "next";
import { WsswAndroid } from "@/components/WsswAndroid";
import { WSWW } from "@/lib/site";

/* wsww.app/android: the Android closed test's sign-up. It lives at /wsww-android/ in this deployment and
   is served at wsww.app/android by a host-matched rewrite (next.config.ts). Instagram's story sticker
   and bio link open it. It goes away when the app is public, so search engines leave it alone. */
const TITLE = "Test What Should We Watch on Android";
const DESCRIPTION = "Tell it how tonight feels and get ten films on your services tonight. Help it onto Google Play.";
const ICONS = "/apps/what-should-we-watch";

export const metadata: Metadata = {
  metadataBase: new URL(WSWW.home),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  applicationName: "What Should We Watch",
  alternates: { canonical: "/android" },
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: `${ICONS}/favicon-32.png`, sizes: "32x32", type: "image/png" }, { url: `${ICONS}/icon-512.png`, sizes: "512x512", type: "image/png" }],
    apple: { url: `${ICONS}/apple-touch-icon-180.png`, sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    url: "/android",
    siteName: "What Should We Watch",
    locale: "en_US",
    title: "Could you help my app onto Google Play?",
    description: DESCRIPTION,
    images: [{ url: `${ICONS}/icon-1024.png`, width: 1024, height: 1024, type: "image/png", alt: "What Should We Watch app icon" }],
  },
  twitter: { card: "summary", title: "Could you help my app onto Google Play?", description: DESCRIPTION, images: [`${ICONS}/icon-1024.png`] },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#17181B" },
  ],
};

export default function WsswAndroidPage() {
  return <WsswAndroid />;
}
