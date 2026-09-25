import type { Post } from "@/lib/posts";

/* A post's cover, or the project's brand placeholder in the right theme. */
export function Cover({ post, className = "", loading = "lazy" }: { post: Pick<Post, "cover" | "coverAlt" | "project">; className?: string; loading?: "eager" | "lazy" }) {
  if (post.cover) {
    return <img className={`cover ${className}`} src={post.cover} alt={post.coverAlt || ""} width={1200} height={675} loading={loading} />;
  }
  const p = post.project || "manali";
  return (
    <picture className={`cover cover--placeholder ${className}`}>
      <source srcSet={`/brand/cover-${p}-dark.svg`} media="(prefers-color-scheme: dark)" />
      <img src={`/brand/cover-${p}-light.svg`} alt="" width={1200} height={675} loading={loading} />
    </picture>
  );
}
