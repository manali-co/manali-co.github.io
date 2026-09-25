import type { Metadata, Viewport } from "next";
import { Fragment } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { site } from "@/lib/site";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Telemetry } from "@/components/Telemetry";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, images: ["/brand/social-preview-1280x640.png"], type: "website" },
  twitter: { card: "summary_large_image" },
  icons: { icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }, { url: "/brand/favicon-32.png", sizes: "32x32" }], apple: "/brand/apple-touch-icon-180.png" },
  alternates: { types: { "application/atom+xml": "/feed.xml" } },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5EE" },
    { media: "(prefers-color-scheme: dark)", color: "#16152E" },
  ],
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const Provider = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? ClerkProvider : Fragment;
  return (
    <Provider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;700&family=Inter:opsz,wght@14..32,400..700&family=JetBrains+Mono:wght@400;500&display=swap"
          />
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body>
          <a className="skip" href="#main">Skip to content</a>
          <Nav />
          <main id="main" className="wrap">
            {children}
          </main>
          <Footer />
          <Telemetry />
        </body>
      </html>
    </Provider>
  );
}
