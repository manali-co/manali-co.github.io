import type { ComponentProps } from "react";
import { webpOf } from "@/lib/webp";

/* An <img> that serves the lossless .webp beside a .png when `npm run images` has made one
   (same pixels, fewer bytes), and the .png itself otherwise. Server-only: it looks in public/. */
export function Img({ src, alt, ...rest }: ComponentProps<"img"> & { src: string; alt: string }) {
  const webp = webpOf(src);
  if (!webp) return <img src={src} alt={alt} {...rest} />;
  return (
    <picture className="img-wrap">
      <source srcSet={webp} type="image/webp" />
      <img src={src} alt={alt} {...rest} />
    </picture>
  );
}
