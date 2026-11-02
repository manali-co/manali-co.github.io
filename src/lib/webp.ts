import fs from "node:fs";
import path from "node:path";

/* The lossless .webp that `npm run images` made beside a site .png, or null when there isn't one. */
export function webpOf(src: string): string | null {
  if (!src.startsWith("/") || !src.endsWith(".png")) return null;
  const webp = src.replace(/\.png$/, ".webp");
  return fs.existsSync(path.join(process.cwd(), "public", webp)) ? webp : null;
}
