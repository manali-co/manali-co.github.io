/* Light/dark image pair. Follows the system by default; site.js flips the media when a
   visitor picks a theme by hand. */
export function Picture({ light, dark, alt, className, width, height, loading }: {
  light: string; dark: string; alt: string; className?: string; width?: number; height?: number; loading?: "eager" | "lazy";
}) {
  return (
    <picture className={className ? `${className}-wrap` : undefined}>
      <source srcSet={dark} media="(prefers-color-scheme: dark)" />
      <img className={className} src={light} alt={alt} width={width} height={height} loading={loading} />
    </picture>
  );
}
