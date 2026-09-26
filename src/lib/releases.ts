// Latest public GitHub release per project. Public API, no token needed; cached by Next for an hour.
export type Release = {
  tag: string;
  name: string;
  date: string;
  url: string;
  note: string;
  assets: { name: string; url: string; size: number }[];
};

/* A release counts as "public" if people can get something from it: it ships downloadable
   assets, or its tag is a plain app version (v1.2.3). Component releases that release-please
   cuts for internal packages (api-v0.1.0, recs-v0.1.0) are not builds anyone can install. */
function isPublic(r: Record<string, unknown>) {
  const assets = (r.assets as unknown[]) || [];
  return assets.length > 0 || /^v?\d+\.\d+/i.test(String(r.tag_name));
}

/* The first real paragraph of the release notes: headings, badges and list markers dropped. */
function firstParagraph(body: string) {
  const blocks = body.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean);
  const block = blocks.find((b) => !/^#{1,6}\s/.test(b) && !/^!\[/.test(b) && !/^(-{3,}|\*{3,})$/.test(b));
  if (!block) return "";
  return block.split(/\r?\n/)[0].replace(/^([-*]|\d+\.)\s+/, "").replace(/\*{1,2}|_{1,2}|`/g, "").slice(0, 240);
}

export async function latestRelease(repoUrl: string): Promise<Release | null> {
  const repo = repoUrl.replace("https://github.com/", "");
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "manali-web" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const list = (await res.json()) as Array<Record<string, unknown>>;
    const r = list.find((x) => !x.draft && !x.prerelease && isPublic(x));
    if (!r) return null;
    return {
      tag: String(r.tag_name),
      name: String(r.name || r.tag_name),
      date: String(r.published_at).slice(0, 10),
      url: String(r.html_url),
      // First paragraph only. The public site never needs the granular changelog.
      note: firstParagraph(String(r.body || "")),
      assets: ((r.assets as Array<Record<string, unknown>>) || []).map((a) => ({
        name: String(a.name),
        url: String(a.browser_download_url),
        size: Number(a.size),
      })),
    };
  } catch {
    return null;
  }
}
