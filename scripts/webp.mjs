/* Lossless WebP copies of the site's PNG covers and app icons: `npm run images`. Same pixels
   (checked below, byte for byte), a third to two thirds the bytes. The PNGs stay: social cards
   and email can't use WebP. <Img> serves the .webp when one sits next to the .png. sharp ships
   with Next, so there's nothing extra to install. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Post images (any depth) and the app icons; not the favicons and touch icons in public/apps/<app>/.
const pngs = [
  ...fs.readdirSync("public/posts", { recursive: true }).map((f) => path.join("public/posts", String(f))),
  ...fs.readdirSync("public/apps").map((f) => path.join("public/apps", f)),
].filter((f) => f.endsWith(".png"));

for (const png of pngs) {
  const webp = png.replace(/\.png$/, ".webp");
  if (fs.existsSync(webp) && fs.statSync(webp).mtimeMs >= fs.statSync(png).mtimeMs) continue;
  const out = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  const [a, b] = await Promise.all([sharp(png).ensureAlpha().raw().toBuffer(), sharp(out).ensureAlpha().raw().toBuffer()]);
  if (!a.equals(b)) { console.warn(`skipped ${png}: the WebP wasn't pixel-identical`); continue; }
  if (out.length >= fs.statSync(png).size) { console.log(`skipped ${png}: the PNG is already smaller`); continue; }
  fs.writeFileSync(webp, out);
  console.log(`${webp}  ${(fs.statSync(png).size / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
}
