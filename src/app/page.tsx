import Link from "next/link";
import { getAllPosts, readableDate } from "@/lib/posts";
import { projects, site } from "@/lib/site";
import { latestRelease } from "@/lib/releases";
import { AuthorLine } from "@/components/AuthorLine";
import { ProjectTag } from "@/components/PostCard";

export const revalidate = 3600;

export default async function Home() {
  const posts = getAllPosts().slice(0, 3);
  const releases = await Promise.all(projects.map((p) => latestRelease(p.repo)));
  return (
    <>
      <section className="hero">
        <picture className="hero__mark">
          <source srcSet="/brand/mark-animated-dark.svg" media="(prefers-color-scheme: dark)" />
          <img src="/brand/mark-animated-light.svg" alt="" width={160} height={160} />
        </picture>
        <h1 className="hero__title">Things we wished existed. So we&apos;re building them.</h1>
        <p className="hero__lede">Not a studio, not a startup. A small place where we make software you can talk to and swipe through, learn whatever it takes, and write down what we learned. Sometimes the agents write it down for us.</p>
        <p className="hero__actions">
          <a className="button button--primary" href="#projects">What we&apos;re building</a>
          <Link className="button" href="/blog/">Read the blog</Link>
        </p>
      </section>

      <section id="projects" className="section">
        <div className="section__head">
          <h2 className="section__title">What we&apos;re building so far</h2>
          <span className="section__lede">More to come. We have a list. It&apos;s longer than it should be.</span>
        </div>
        <div className="cards">
          {projects.map((p, i) => {
            const rel = releases[i];
            return (
              <article key={p.slug} className={`card card--project card--${p.well}`}>
                <img className="card__icon" src={p.icon} alt="" width={72} height={72} />
                <div className="card__body">
                  <h3 className="card__title"><Link className="card__stretch" href={`/${p.slug}/`}>{p.name}</Link> <span className="card__platform">{p.platform}</span></h3>
                  <p className="card__blurb">{p.blurb}</p>
                  <p className="card__meta">
                    <span className={`badge badge--${p.status}`}>{p.statusLabel}</span>
                    <span className="badge badge--quiet">{p.license}</span>
                    <a className="card__link" href={p.repo} target="_blank" rel="noopener">Source</a>
                    <Link className="card__link" href={`/${p.slug}/#posts`}>Posts</Link>
                  </p>
                  <p className="card__release">
                    {rel ? (
                      <>
                        <span className="release__version">{rel.tag}</span>
                        <time dateTime={rel.date}>{readableDate(rel.date)}</time>
                        {rel.note && <span className="card__release-note">{rel.note}</span>}
                        {rel.assets[0] ? <a className="button button--primary button--sm" href={rel.assets[0].url}>Download</a> : null}
                        <a className="button button--sm" href={rel.url} target="_blank" rel="noopener">Release notes</a>
                      </>
                    ) : (
                      <span className="muted">{p.noBuild}</span>
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">What&apos;s new</h2>
          <Link className="section__more" href="/blog/">All posts →</Link>
        </div>
        <ol className="feed">
          {posts.map((post) => (
            <li key={post.slug} className="feed__item">
              <time className="feed__date" dateTime={post.date}>{readableDate(post.date)}</time>
              <div className="feed__body">
                <span className="feed__meta"><ProjectTag project={post.project} /><Link className="feed__title" href={post.url}>{post.title}</Link></span>
                {post.summary && <p className="feed__detail">{post.summary}</p>}
                <AuthorLine author={post.author} project={post.project} compact />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <h2 className="section__title">How this works</h2>
        <dl className="principles">
          <div><dt>Small pieces, one job each.</dt><dd>Every module gets run on its own before it&apos;s allowed to talk to the next one.</dd></div>
          <div><dt>Design first, code second.</dt><dd>Visuals are argued out in Claude Design and then ported. Nobody improvises a button in a PR.</dd></div>
          <div><dt>Boring CI, on purpose.</dt><dd>Lint, types and tests on every pull request. feature/* → dev → main. Green or it doesn&apos;t go in.</dd></div>
          <div><dt>Credit is the currency.</dt><dd>Yapp and the brand are CC BY 4.0: use them, just say where they came from. What Should We Watch is ours; read it, learn from it, ask before you ship it.</dd></div>
        </dl>
      </section>

      <section className="section section--quiet">
        <div>
          <h2 className="section__title section__title--sm">Want to collaborate?</h2>
          <p>Happy to. Open an issue, send a PR, or start a discussion. If you&apos;ve got a thing you wish existed and it fits here, we&apos;d like to hear about it.</p>
        </div>
        <a className="button" href={`https://github.com/${site.giscus.repo}/discussions`} target="_blank" rel="noopener">Start a discussion</a>
      </section>
    </>
  );
}
