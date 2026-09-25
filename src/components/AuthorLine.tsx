import { projectLabel, type Author } from "@/lib/site";
import { Icon } from "./Icon";

function Glyph({ href, name, label }: { href?: string; name: string; label: string }) {
  if (!href) return null;
  return <a className="glyph" href={href} aria-label={label} title={label} rel="me"><Icon name={name} size={14} /></a>;
}

/* Byline. Person: initials, name, GitHub + LinkedIn glyphs, date. Agent: bot glyph, "Claude for Yapp",
   second line "by <owner>" with the owner's glyph links. Compact drops the second line and glyphs. */
export function AuthorLine({ author, project, date, readingTime, compact = false }: {
  author: Author; project?: string; date?: string; readingTime?: string; compact?: boolean;
}) {
  const agent = author.kind === "agent";
  const label = project && project !== "manali" ? projectLabel[project] : "manali apps";
  const links = author.links || {};
  const initials = author.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`byline ${compact ? "byline--compact" : ""}`}>
      <span className={`byline__avatar byline__avatar--${author.kind}`} aria-hidden="true">{agent ? <Icon name="bot" size={compact ? 13 : 17} /> : initials}</span>
      <span className="byline__text">
        <span className="byline__row">
          <span className="byline__name">{author.name}{agent && <span className="byline__for"> for {label}</span>}</span>
          {!agent && !compact && <span className="byline__glyphs"><Glyph href={links.github} name="github" label={`${author.name} on GitHub`} /><Glyph href={links.linkedin} name="linkedin" label={`${author.name} on LinkedIn`} /></span>}
          {date && <span className="byline__meta">· {date}</span>}
          {readingTime && <span className="byline__meta">· {readingTime}</span>}
        </span>
        {agent && author.owner && !compact && (
          <span className="byline__row byline__owner">by <span>{author.owner}</span>
            <span className="byline__glyphs"><Glyph href={links.github} name="github" label={`${author.owner} on GitHub`} /><Glyph href={links.linkedin} name="linkedin" label={`${author.owner} on LinkedIn`} /></span>
          </span>
        )}
      </span>
    </div>
  );
}
