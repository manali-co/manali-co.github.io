import { projectLabel, type Author } from "@/lib/site";

/* Who wrote it. Agents carry an owner: "Claude for Yapp", then "by Ayush Manish Agrawal" with links. */
export function AuthorLine({ author, project, date, readingTime, compact = false }: {
  author: Author; project?: string; date?: string; readingTime?: string; compact?: boolean;
}) {
  const agent = author.kind === "agent";
  const forProject = agent && project && project !== "manali" ? ` for ${projectLabel[project]}` : "";
  const links = author.links || {};
  return (
    <div className={compact ? "author-line author-line--compact" : "byline"}>
      <span className={`author author--${author.kind}`}>
        {author.name}{forProject}
      </span>
      {!compact && (
        <span className="byline__owner">
          {agent && author.owner ? <>by <a href={links.github} rel="me">{author.owner}</a></> : null}
          {(links.github || links.linkedin) && (
            <span className="byline__links">
              {links.github && <a href={links.github} rel="me">GitHub</a>}
              {links.linkedin && <a href={links.linkedin} rel="me">LinkedIn</a>}
            </span>
          )}
          {date && <span> · {date}</span>}
          {readingTime && <span> · {readingTime}</span>}
        </span>
      )}
    </div>
  );
}
