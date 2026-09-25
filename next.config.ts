import type { NextConfig } from "next";

/* STATIC_EXPORT=1 produces a plain static site for GitHub Pages (home, blog, posts, projects,
   feed, social cards). Server-only routes (admin, sign-in, unsubscribe, /api/*) are set aside by
   scripts/static-export.mjs for that build, and Clerk is swapped for a stub since its package
   ships server actions. The Vercel build keeps everything. */
const isStatic = process.env.STATIC_EXPORT === "1";
const stub = "./src/lib/clerk-stub.tsx";

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
        turbopack: { resolveAlias: { "@clerk/nextjs": stub } },
      }
    : {}),
};

export default nextConfig;
