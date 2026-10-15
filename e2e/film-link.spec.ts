import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/* wsww.app/f/<token>: the page someone opens from a film a friend sent, without the app.
   Design: Claude Design, Taste together 2 (S3 "Received without the app") and 8 (the redraws:
   S3 after Keep it in the app, X10 after Seen it, #6 the preview card). The API is mocked by
   e2e/mock-api.mjs; its tokens are listed there. */

const MOCK = `http://127.0.0.1:${process.env.MOCK_API_PORT || 7199}`;
const TOKEN = "Q3v9mT2xK7pLwZ4rN8bYcA";
const XSS = "XssNote0000000000000aa";
const APP_STORE = "https://apps.apple.com/app/id6814684533";
const NETFLIX = "https://www.netflix.com/title/80192014";

async function apiLog(request: APIRequestContext) {
  return (await (await request.get(`${MOCK}/__log`)).json()) as { method: string; path: string; ip: string | null; body: Record<string, unknown> | null }[];
}
const resetLog = (request: APIRequestContext) => request.post(`${MOCK}/__reset`);
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.beforeEach(async ({ request }) => {
  await resetLog(request);
});

test.describe("server-rendered page", () => {
  test("head carries the title, the preview tags, noindex and no-referrer", async ({ request }) => {
    const res = await request.get(`/f/${TOKEN}`, { headers: { "x-forwarded-for": "203.0.113.7" } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    const head = html.split("</head>")[0];
    expect(head).toContain("<title>Manali sent you Paddington 2</title>");
    expect(head).toMatch(/<meta name="robots" content="noindex, nofollow"\/?>/);
    expect(head).toMatch(/<meta name="referrer" content="no-referrer"\/?>/);
    expect(head).toMatch(/<meta property="og:title" content="Paddington 2"\/?>/);
    expect(head).toMatch(/<meta property="og:description" content="2017 · 1 h 43 m · on Netflix in the US"\/?>/);
    expect(head).toMatch(new RegExp(`<meta property="og:image" content="http://[^"]+/f/${TOKEN}/card"/?>`));
    expect(head).toMatch(/<meta property="og:image:width" content="1200"\/?>/);
    expect(head).toMatch(/<meta name="twitter:card" content="summary_large_image"\/?>/);
    // Headers, for clients that never parse the page.
    expect(res.headers()["referrer-policy"]).toBe("no-referrer");
    expect(res.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(res.headers()["cache-control"]).toContain("no-store");
    // The visitor's address reaches the API for its per-IP limits, and nothing else is sent.
    const reads = (await apiLog(request)).filter((r) => r.path === "/v1/links/read");
    expect(reads.length).toBeGreaterThan(0);
    // The token goes in the body, never in a URL the API would log.
    expect(reads.every((g) => g.method === "POST" && g.body?.token === TOKEN && g.ip === "203.0.113.7")).toBe(true);
  });

  test("link-preview crawlers get the same tags in <head>", async ({ request }) => {
    const res = await request.get(`/f/${TOKEN}`, { headers: { "user-agent": "facebookexternalhit/1.1 Facebot Twitterbot/1.0" } });
    const head = (await res.text()).split("</head>")[0];
    expect(head).toMatch(/<meta property="og:title" content="Paddington 2"\/?>/);
    expect(head).toMatch(/<meta name="robots" content="noindex, nofollow"\/?>/);
  });

  test("the film, the sender and the note render", async ({ page }) => {
    await page.goto(`/f/${TOKEN}`);
    await expect(page.getByRole("heading", { name: "Manali sent you Paddington 2" })).toBeVisible();
    await expect(page.getByText("2017 · 1 h 43 m", { exact: true })).toBeVisible();
    await expect(page.getByText("On Netflix in the US tonight.", { exact: true })).toBeVisible();
    await expect(page.getByText("“bring tissues”", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Netflix" })).toHaveAttribute("href", NETFLIX);
    await expect(page.getByRole("button", { name: "Seen it" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep it in the app" })).toBeVisible();
    await expect(page.getByText("Nothing here reaches Manali unless you tap Seen it. Get the app and this film is already waiting on your shortlist.")).toBeVisible();
    expect(await noSideScroll(page)).toBe(true);
  });

  test("the page stands alone: no manali.page header, nav, skip link or footer in the HTML", async ({ page, request }) => {
    for (const t of [TOKEN, "Unknown000000000000000"]) {
      const html = await (await request.get(`/f/${t}`)).text();
      const body = html.split("<body")[1] ?? "";
      for (const marker of ['class="nav"', 'class="footer"', 'class="skip"', "Skip to content", "Buy us a coffee", "manali apps by"]) {
        expect(body, `${t}: ${marker}`).not.toContain(marker);
      }
      await page.goto(`/f/${t}`);
      await expect(page.locator("header.nav, footer, nav, a.skip")).toHaveCount(0);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.getByText("What Should We Watch · wsww.app")).toBeVisible();
    }
  });

  test("user text stays text: the name and the note are escaped and never linked", async ({ page, request }) => {
    const raw = await (await request.get(`/f/${XSS}`)).text();
    expect(raw).not.toContain("<script>window.__pwned");
    expect(raw).not.toContain("<b>bring</b>");
    await page.goto(`/f/${XSS}`);
    await expect(page.getByRole("heading", { name: "<i>Jo</i> sent you Past Lives" })).toBeVisible();
    const note = page.getByText("<b>bring</b> tissues", { exact: false });
    await expect(note).toHaveText("“<b>bring</b> tissues <script>window.__pwned=1</script> https://evil.example/x”");
    await expect(note.locator("a, b, script")).toHaveCount(0);
    await expect(page.locator('a[href*="evil.example"]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  });
});

test.describe("answers", () => {
  test("Seen it → Liked it tells the sender and shows the code (X10)", async ({ page, request }) => {
    await page.goto(`/f/${TOKEN}`);
    await page.getByRole("button", { name: "Seen it" }).click();
    const sheet = page.getByRole("dialog", { name: "How was it?" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "It was okay" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Not for me" })).toBeVisible();
    expect(await noSideScroll(page)).toBe(true);
    await sheet.getByRole("button", { name: "Liked it" }).click();
    await expect(page.getByRole("heading", { name: "Told Manali you liked it." })).toBeVisible();
    await expect(page.getByText("Keep this in the app · your code")).toBeVisible();
    await expect(page.getByText("KQ7W3D", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Copy the code and get the app" })).toHaveAttribute("href", APP_STORE);
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
    expect(await noSideScroll(page)).toBe(true);
    // One reaction, from a random id this browser keeps, and nothing else.
    const posts = (await apiLog(request)).filter((r) => r.path !== "/v1/links/read");
    expect(posts).toHaveLength(1);
    expect(posts[0].path).toBe("/v1/links/react");
    expect(Object.keys(posts[0].body || {}).sort()).toEqual(["reaction", "token", "webId"]);
    expect(posts[0].body?.token).toBe(TOKEN);
    expect(posts[0].body?.reaction).toBe("liked");
    const webId = posts[0].body?.webId as string;
    expect(webId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(await page.evaluate(() => Object.values(localStorage))).toContain(webId);
    expect(await page.evaluate(() => document.cookie)).toBe("");
  });

  test("Seen it → Not for me stays with the person (Kept to you.)", async ({ page, request }) => {
    await page.goto(`/f/${TOKEN}`);
    await page.getByRole("button", { name: "Seen it" }).click();
    await page.getByRole("dialog", { name: "How was it?" }).getByRole("button", { name: "Not for me" }).click();
    await expect(page.getByRole("heading", { name: "Kept to you." })).toBeVisible();
    await expect(page.getByText("Manali only hears about the films you liked.")).toBeVisible();
    await expect(page.getByText("Told Manali", { exact: false })).toHaveCount(0);
    const posts = (await apiLog(request)).filter((r) => r.path !== "/v1/links/read");
    expect(posts.map((p) => p.body?.reaction)).toEqual(["not_for_me"]);
  });

  test("Keep it in the app copies the code and shows it (S3 after Keep)", async ({ page, context, request }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/f/${TOKEN}`);
    await page.getByRole("button", { name: "Keep it in the app" }).click();
    await expect(page.getByText("Your code · copied")).toBeVisible();
    await expect(page.getByText("KQ7W3D", { exact: true })).toBeVisible();
    await expect(page.getByText("It’s on your clipboard and good for 24 hours.", { exact: false })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("KQ7W3D");
    await expect(page.getByRole("link", { name: "Get the app" })).toHaveAttribute("href", APP_STORE);
    await expect(page.getByRole("link", { name: "Open Netflix instead" })).toHaveAttribute("href", NETFLIX);
    expect(await noSideScroll(page)).toBe(true);
    const posts = (await apiLog(request)).filter((r) => r.path !== "/v1/links/read");
    expect(posts.map((p) => p.path)).toEqual(["/v1/links/keep"]);
    expect(Object.keys(posts[0].body || {}).sort()).toEqual(["token", "webId"]);
  });
});

test.describe("links that don't work", () => {
  test("unknown, expired, revoked, malformed and switched-off links get one identical page", async ({ page }) => {
    const texts: string[] = [];
    for (const t of ["Unknown000000000000000", "NotEnabled000000000000", "short", "Q3v9mT2xK7pLwZ4rN8bYc!"]) {
      await page.goto(`/f/${encodeURIComponent(t)}`);
      await expect(page.getByRole("heading", { name: "This link isn’t available." })).toBeVisible();
      texts.push(await page.locator("main").innerText());
      expect(await noSideScroll(page)).toBe(true);
    }
    expect(new Set(texts).size).toBe(1);
    const html = await (await page.request.get("/f/Unknown000000000000000")).text();
    expect(html.split("</head>")[0]).toMatch(/<meta name="robots" content="noindex, nofollow"\/?>/);
    expect(html).not.toContain("og:image");
  });

  test("production serves no-store on every link page and answer, whatever the outcome", async ({ request }) => {
    const directives = (h: Record<string, string>) => (h["cache-control"] || "").split(",").map((s) => s.trim());
    for (const path of [`/f/${TOKEN}`, "/f/Unknown000000000000000", "/f/short"]) {
      const res = await request.get(path);
      expect(directives(res.headers()), path).toContain("no-store");
      expect(res.headers()["referrer-policy"], path).toBe("no-referrer");
      expect(res.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
    }
    const answers = [
      await request.post("/api/links/keep/", { data: { token: TOKEN, webId: "abcdefgh1234" } }),
      await request.post("/api/links/react/", { data: { token: TOKEN, reaction: "loved", webId: "abcdefgh1234" } }),
      await request.post("/api/links/keep/", { data: { token: "Unknown000000000000000", webId: "abcdefgh1234" } }),
      await request.post("/api/links/keep/", { data: { token: "RateLimited00000000000", webId: "abcdefgh1234" } }),
    ];
    expect(answers.map((r) => r.status())).toEqual([200, 400, 404, 429]);
    for (const r of answers) expect(directives(r.headers()), String(r.status())).toContain("no-store");
    expect(directives((await request.get(`/f/${TOKEN}/card`)).headers())).toContain("no-store");
  });

  test("the proxy routes validate before calling the API and never cache", async ({ request }) => {
    // The browser-to-site calls carry the token in the body too, so no request log holds it.
    const bad = await request.post(`/api/links/react/`, { data: { token: TOKEN, reaction: "loved", webId: "abcdefgh1234" } });
    expect(bad.status()).toBe(400);
    const badId = await request.post(`/api/links/keep/`, { data: { token: TOKEN, webId: "no spaces allowed" } });
    expect(badId.status()).toBe(400);
    expect(await apiLog(request)).toHaveLength(0);
    const ok = await request.post(`/api/links/keep/`, { data: { token: TOKEN, webId: "abcdefgh1234" }, headers: { "x-forwarded-for": "198.51.100.4" } });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toMatchObject({ code: "KQ7W3D" });
    expect(ok.headers()["cache-control"]).toContain("no-store");
    expect(ok.headers()["referrer-policy"]).toBe("no-referrer");
    expect(ok.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect((await apiLog(request))[0]).toMatchObject({ path: "/v1/links/keep", ip: "198.51.100.4", body: { token: TOKEN, webId: "abcdefgh1234" } });
    const gone = await request.post(`/api/links/react/`, { data: { token: "Unknown000000000000000", reaction: "liked", webId: "abcdefgh1234" } });
    expect(gone.status()).toBe(404);
    expect(await gone.json()).toEqual({ code: "link_unavailable" });
  });
});

test.describe("preview card", () => {
  test("is a 1200×630 PNG for a live link, and nothing for an unavailable one", async ({ request }) => {
    const res = await request.get(`/f/${TOKEN}/card`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const png = await res.body();
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect((await request.get(`/f/Unknown000000000000000/card`)).status()).toBe(404);
  });
});

test.describe("hosts", () => {
  test("the apple-app-site-association file is JSON at its exact path, no redirect", async ({ request }) => {
    const res = await request.get("/.well-known/apple-app-site-association", { headers: { host: "wsww.app" }, maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^application\/json/);
    const aasa = await res.json();
    expect(aasa.applinks.details).toEqual([
      {
        appIDs: ["W6RL988KTP.co.manali.wsww"],
        components: [
          expect.objectContaining({ "/": "/f/*" }),
          expect.objectContaining({ "/": "/g/*" }),
          expect.objectContaining({ "/": "/j/*" }),
        ],
      },
    ]);
  });

  test("wsww.app's robots.txt keeps crawlers off the links; manali.page's is unchanged", async ({ request }) => {
    const wsww = await (await request.get("/robots.txt", { headers: { host: "wsww.app" } })).text();
    expect(wsww).toMatch(/Disallow: \/f\//);
    const manali = await (await request.get("/robots.txt", { headers: { host: "manali.page" } })).text();
    expect(manali).not.toMatch(/\/f\//);
    expect(manali).toMatch(/Sitemap: https:\/\/manali\.page\/sitemap\.xml/);
  });

  test("manali.page doesn't answer for wsww.app's paths", async ({ request }) => {
    expect((await request.get(`/f/${TOKEN}`, { headers: { host: "manali.page" } })).status()).toBe(404);
    expect((await request.get("/.well-known/apple-app-site-association", { headers: { host: "manali.page" } })).status()).toBe(404);
    expect((await request.get(`/f/${TOKEN}/card`, { headers: { host: "manali.page" } })).status()).toBe(404);
  });

  test("the token never leaves for another host, and no referrer goes with anything", async ({ page }) => {
    const leaks: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.protocol === "data:") return;
      // On our own host only the page itself has the token in its address (answers carry it in the body).
      if (u.hostname === "127.0.0.1") {
        if (r.url().includes(TOKEN) && r.resourceType() !== "document") leaks.push(r.url());
        return;
      }
      // Font files carry the Google stylesheet's own address as their referrer; never this page's.
      const referer = r.headers()["referer"] || "";
      if (r.url().includes(TOKEN) || referer.includes(TOKEN) || referer.includes("127.0.0.1")) leaks.push(`${r.url()} ← ${referer}`);
    });
    await page.goto(`/f/${TOKEN}`);
    await page.getByRole("button", { name: "Seen it" }).click();
    await page.getByRole("dialog", { name: "How was it?" }).getByRole("button", { name: "Liked it" }).click();
    await expect(page.getByText("KQ7W3D", { exact: true })).toBeVisible();
    expect(leaks).toEqual([]);
  });
});
