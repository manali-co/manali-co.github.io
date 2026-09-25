import type { Post } from "@/lib/posts";
import { projects } from "@/lib/site";

type CoverPost = Pick<Post, "cover" | "coverAlt" | "project"> & { coverText?: string; coverVariant?: "type" | "icon" | "mono" };

/* 16:9 cover. An image if the post has one; otherwise the brand builds one: a `type` cover
   (one word or number in Comfortaa, or mono), an `icon` cover (the app icon on its ground),
   or the quiet placeholder (ground, mark, project dot). Never stock photography. */
export function Cover({ post, className = "", loading = "lazy" }: { post: CoverPost; className?: string; loading?: "eager" | "lazy" }) {
  if (post.cover) {
    return <img className={`cover ${className}`} src={post.cover} alt={post.coverAlt || ""} width={1200} height={675} loading={loading} />;
  }
  const p = post.project || "manali";
  const proj = projects.find((x) => x.slug === p);
  if (post.coverVariant === "icon" && proj) {
    return (
      <div className={`cover cover--icon cover--${proj.well} ${className}`} role="img" aria-label={post.coverAlt || proj.name}>
        <img src={proj.icon} alt="" className="cover__icon" />
        <span className="cover__mark" aria-hidden="true" /><span className={`cover__dot cover__dot--${p}`} aria-hidden="true" />
      </div>
    );
  }
  if (post.coverText) {
    return (
      <div className={`cover cover--type ${post.coverVariant === "mono" ? "cover--mono" : ""} ${className}`} role="img" aria-label={post.coverAlt || post.coverText}>
        <span className="cover__text">{post.coverText}</span>
        <span className="cover__mark" aria-hidden="true" /><span className={`cover__dot cover__dot--${p}`} aria-hidden="true" />
      </div>
    );
  }
  return (
    <picture className={`cover cover--placeholder ${className}`}>
      <source srcSet={`/brand/cover-${p}-dark.svg`} media="(prefers-color-scheme: dark)" />
      <img src={`/brand/cover-${p}-light.svg`} alt="" width={1200} height={675} loading={loading} />
    </picture>
  );
}
