import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSeries, getSeries, seriesView } from "@/lib/series";
import { site } from "@/lib/site";
import { Icon } from "@/components/Icon";
import { ShareRow } from "@/components/ShareRow";
import { SeriesHeader } from "@/components/series/SeriesHeader";
import { SeriesParts } from "@/components/series/SeriesParts";
import { SeriesFollow } from "@/components/series/SeriesFollow";

/* A series hub (design system: ui_kits/blog/SeriesPage.jsx). One page per series that has at
   least one part out: the thing to share and the page search engines find for the topic. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getPublicSeries().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = getSeries((await params).slug);
  if (!s || !s.published) return {};
  return {
    title: s.title,
    description: s.summary,
    alternates: { canonical: s.url },
    openGraph: { type: "website", url: s.url, title: s.title, description: s.summary },
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const found = getSeries((await params).slug);
  if (!found || !found.published) notFound();
  const series = seriesView(found);
  const url = `${site.url}${series.href}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: series.name,
    description: series.summary,
    url,
    image: `${url}opengraph-image`,
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    hasPart: found.parts.flatMap((p) => (p.state === "published" ? [{ "@type": "BlogPosting", position: p.part, headline: p.post.title, url: `${site.url}${p.post.url}`, datePublished: p.post.date }] : [])),
  };
  const share = <ShareRow url={url} title={series.name} summary={series.summary} />;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="series-hub">
        <Link className="series-hub__back" href="/blog/"><Icon name="arrow-left" size={15} />All posts</Link>
        <div className="series-hub__grid">
          <div className="series-hub__main">
            <SeriesHeader series={series} />
            <div className="series-hub__share--phone">{share}</div>
            <section className="series-hub__parts" aria-labelledby="every-part">
              <h2 id="every-part" className="series-mono series-mono--muted" style={{ fontWeight: 400, margin: 0 }}>Every part</h2>
              <SeriesParts variant="hub" heading={false} series={series} />
            </section>
            {!series.complete && <div className="series-hub__follow--phone" data-series-follow><SeriesFollow id="follow" series={series.slug} seriesName={series.name} /></div>}
          </div>
          <aside className="series-hub__side">
            {!series.complete && <div data-series-follow><SeriesFollow id="follow-side" series={series.slug} seriesName={series.name} /></div>}
            {share}
          </aside>
        </div>
      </div>
    </>
  );
}
