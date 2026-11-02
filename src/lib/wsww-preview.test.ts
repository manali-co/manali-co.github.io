import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import proxy from "../proxy";
import { readFileSync } from "node:fs";
import { cmapCodepoints, keepDrawn } from "./font-coverage";
import { previewImageResponse } from "./wsww-preview-routes";
import { cacheHeaders, cacheSeconds, copyFor, cut, isPreviewBot, names, parsePreview, posterUrl, previewHtml, type Person, type Preview } from "./wsww-preview";

/* wsww.app's link previews (Claude Design board 20): the board's copy word for word, what reaches
   the image and the tags, and who gets the preview page. */

const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const mina: Person = { firstName: "Manali", avatar: { hue: "coral", shape: "round" } };
const IMESSAGE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0";
const WHATSAPP = "WhatsApp/2.23.20.0 A";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MOTN = "https://cdn.movieofthenight.com/show/1/poster/vertical/en/480.jpg?Expires=1&Signature=x";

test("board 20 table A: the invite", () => {
  const c = copyFor({ kind: "invite", from: mina, expiresAt: 0, maxAgeS: 60 });
  assert.equal(c.title, "Manali wants to be friends on What Should We Watch");
  // The board's "15 minutes" is the claim code's life; an add link lives 7 days (ADR 0004).
  assert.equal(c.description, "Tap to add Manali. You’ll send each other films and hear how they landed. The link works for 7 days.");
  assert.equal(c.alt, "Manali wants to be friends. Tap to add Manali on What Should We Watch.");
});

test("board 20 table A: a film with a pitch, without one, and from a copied link", () => {
  const film = { title: "Remarkably Bright Creatures", year: 2026, posterUrl: null };
  const pitch = copyFor({ kind: "film", film, from: mina, pitch: "An octopus solves a thirty-year-old mystery. You’ll be fine, I promise.", maxAgeS: 300 });
  assert.equal(pitch.title, "Remarkably Bright Creatures (2026)");
  assert.equal(pitch.description, "“An octopus solves a thirty-year-old mystery. You’ll be fine, I promise.” Manali sent it on What Should We Watch.");
  assert.equal(copyFor({ kind: "film", film, from: mina, pitch: null, maxAgeS: 300 }).description, "Manali sent you this on What Should We Watch.");
  assert.equal(copyFor({ kind: "film", film, from: null, pitch: null, maxAgeS: 300 }).description, "On What Should We Watch.");
  // The quote is the sender's line, verbatim, cut at 120 characters with an ellipsis.
  const long = copyFor({ kind: "film", film, from: mina, pitch: "a".repeat(140), maxAgeS: 300 }).description;
  assert.equal(long, `“${"a".repeat(119)}…” Manali sent it on What Should We Watch.`);
});

test("board 20 table A: group, expired, missing, withdrawn", () => {
  const jo: Person = { firstName: "Jo", avatar: null }, sam: Person = { firstName: "Sam", avatar: null };
  const g = copyFor({ kind: "group", from: mina, group: "The Flat", members: [mina, jo, sam], maxAgeS: 3600 });
  assert.equal(g.title, "Manali asked you into The Flat");
  assert.equal(g.description, "Pick films with Manali, Jo and Sam on What Should We Watch. Works without the app · 7 days.");
  assert.equal(names([mina, jo, sam, jo, sam]), "Manali, Jo and 3 others");
  const e = copyFor({ kind: "expired", from: mina, maxAgeS: 60 });
  assert.deepEqual([e.title, e.description], ["This link has expired", "Ask Manali for a new one. A link to add a friend lasts 7 days."]);
  assert.equal(copyFor({ kind: "expired", from: null, maxAgeS: 60 }).description, "A link to add a friend lasts 7 days.");
  const m = copyFor({ kind: "missing", maxAgeS: 300 });
  assert.deepEqual([m.title, m.description], ["This film isn’t here any more", "It may have left the catalogue. Open What Should We Watch to find something like it."]);
  const w = copyFor({ kind: "withdrawn", group: "The Flat", maxAgeS: 3600 });
  assert.deepEqual([w.title, w.description], ["This invitation was withdrawn", "Ask someone in the group for a new link."]);
});

test("names over 18 characters are cut before layout", () => {
  assert.equal(cut("Bartholomew-Alexandria", 18), "Bartholomew-Alexa…");
  assert.equal(copyFor({ kind: "invite", from: { firstName: "Bartholomew-Alexandria", avatar: null }, expiresAt: 0, maxAgeS: 60 }).heading, "Bartholomew-Alexa… wants to be friends");
});

test("the API's answer is read field by field and kept to its path", () => {
  const invite = { kind: "invite", from: { firstName: "Manali", avatar: { hue: "coral", shape: "pebble", face: "wink" }, email: "x@y" }, expiresAt: 99, maxAgeS: 60 };
  assert.deepEqual(parsePreview(invite, "add"), { kind: "invite", from: { firstName: "Manali", avatar: { hue: "coral", shape: "pebble" } }, expiresAt: 99, maxAgeS: 60 });
  // An invite's token on /f/, or a film's on /add/, is never shown as the other.
  assert.equal(parsePreview(invite, "f")?.kind, "missing");
  assert.equal(parsePreview({ kind: "film", film: { title: "Heat" }, maxAgeS: 300 }, "add")?.kind, "expired");
  // A missing add link is an expired invite that names no one.
  assert.deepEqual(parsePreview({ kind: "missing", maxAgeS: 300 }, "add"), { kind: "expired", from: null, maxAgeS: 60 });
  // An unknown hue draws the default Disco; a strange answer is no preview at all.
  assert.equal((parsePreview({ ...invite, from: { firstName: "M", avatar: { hue: "red" } } }, "add") as { from: Person }).from.avatar, null);
  assert.equal(parsePreview({ kind: "admin" }, "add"), null);
  assert.equal(parsePreview(null, "f"), null);
  // A film's poster only from the catalog's CDN.
  const film = parsePreview({ kind: "film", film: { title: "Heat", year: 1995, posterUrl: "https://evil.example/x.jpg" }, maxAgeS: 300 }, "f") as Extract<Preview, { kind: "film" }>;
  assert.equal(film.film.posterUrl, null);
});

test("a poster from anywhere but the catalog's CDN is never fetched", () => {
  assert.equal(posterUrl(MOTN), MOTN);
  for (const u of ["http://cdn.movieofthenight.com/x.jpg", "https://cdn.movieofthenight.com.evil.example/x.jpg", "https://u:p@cdn.movieofthenight.com/x.jpg", "https://cdn.movieofthenight.com:444/x.jpg", "https://169.254.169.254/", "file:///etc/passwd", "javascript:alert(1)", 42]) {
    assert.equal(posterUrl(u), null, String(u));
  }
});

test("an invite is never cached past its expiry, and never more than 60 s", () => {
  const now = 1_000_000;
  assert.equal(cacheSeconds({ kind: "invite", from: mina, expiresAt: now + 20, maxAgeS: 60 }, now), 20);
  assert.equal(cacheSeconds({ kind: "invite", from: mina, expiresAt: now + 9999, maxAgeS: 60 }, now), 60);
  assert.equal(cacheSeconds({ kind: "invite", from: mina, expiresAt: now - 5, maxAgeS: 60 }, now), 0);
  assert.equal(cacheHeaders({ kind: "invite", from: mina, expiresAt: 1, maxAgeS: 60 })["Cache-Control"], "no-store");
  assert.equal(cacheHeaders({ kind: "missing", maxAgeS: 300 })["Cache-Control"], "public, max-age=300, s-maxage=300");
});

test("the preview page carries the board's tags and escapes what people wrote", () => {
  const html = previewHtml(copyFor({ kind: "film", film: { title: `<script>"x"</script>`, year: 2026, posterUrl: null }, from: mina, pitch: `it's <b>good</b>`, maxAgeS: 300 }), "https://wsww.app/f/T", "https://wsww.app/f/T/og.png");
  assert.ok(!html.includes("<script>") && !html.includes("<b>"));
  for (const tag of ['property="og:type" content="website"', 'property="og:site_name" content="What Should We Watch"', 'name="twitter:card" content="summary_large_image"', 'property="og:image" content="https://wsww.app/f/T/og.png"', 'property="og:image:width" content="1200"', 'name="robots" content="noindex, nofollow"']) {
    assert.ok(html.includes(tag), tag);
  }
});

test("preview fetchers are told apart from people", () => {
  for (const ua of [IMESSAGE, WHATSAPP, "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", "TelegramBot (like TwitterBot)", "Slackbot-LinkExpanding 1.0", "Mozilla/5.0 (compatible; Discordbot/2.0)"]) assert.ok(isPreviewBot(ua), ua);
  for (const ua of [SAFARI, "", null, "curl/8.4.0"]) assert.ok(!isPreviewBot(ua), String(ua));
});

const req = (url: string, ua: string) => new NextRequest(url, { headers: { host: new URL(url).host, "user-agent": ua } });

test("a preview fetcher reads the link's preview page; a person still goes home", async () => {
  for (const [path, kind] of [[`/add/${TOKEN}`, "add"], [`/f/${TOKEN}/`, "f"]]) {
    const bot = await proxy(req(`https://wsww.app${path}`, IMESSAGE));
    assert.equal(bot?.headers.get("x-middleware-rewrite"), `https://wsww.app/wsww-link-preview/${kind}/${TOKEN}/`, path);
    const person = await proxy(req(`https://wsww.app${path}`, SAFARI));
    assert.equal(person?.status, 307);
    assert.equal(person?.headers.get("location"), "https://wsww.app/");
  }
  // Anything that isn't a link's own address goes home for a fetcher too.
  for (const url of ["https://wsww.app/add", "https://wsww.app/f/short", `https://wsww.app/f/${TOKEN}/card`]) {
    assert.equal((await proxy(req(url, WHATSAPP)))?.status, 307, url);
  }
  // On manali.page nothing changes.
  assert.equal(await proxy(req(`https://manali.page/add/${TOKEN}`, IMESSAGE)), undefined);
});

test("the preview image is served as is, to fetchers and people alike", async () => {
  for (const ua of [IMESSAGE, SAFARI]) {
    const res = await proxy(req(`https://wsww.app/f/${TOKEN}/og.jpg`, ua));
    assert.equal(res?.headers.get("x-middleware-next"), "1", ua);
  }
});

test("a query never reaches the image (one link, one cache entry)", async () => {
  const res = await proxy(req(`https://wsww.app/add/${TOKEN}/og.png?x=1`, IMESSAGE));
  assert.equal(res?.status, 404);
  const page = await proxy(req(`https://wsww.app/f/${TOKEN}?utm_source=share`, IMESSAGE));
  assert.equal(page?.headers.get("x-middleware-rewrite"), `https://wsww.app/wsww-link-preview/f/${TOKEN}/`);
});

test("nothing renders for a malformed token, a query, or another host in production", async () => {
  const env = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    const get = (url: string) => previewImageResponse(new Request(url, { headers: { host: new URL(url).host } }), "add", new URL(url).pathname.split("/")[2]);
    for (const url of ["https://wsww.app/add/abc/og.png", `https://wsww.app/add/${TOKEN}/og.png?x=1`, `https://manali.page/add/${TOKEN}/og.png`, `https://manali-web.vercel.app/add/${TOKEN}/og.png`]) {
      assert.equal((await get(url)).status, 404, url);
    }
  } finally {
    if (env === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = env;
  }
});

test("the image keeps only what its own fonts draw, so no text is sent to fetch a glyph", () => {
  const drawn = cmapCodepoints(readFileSync("src/assets/fonts/Figtree_400Regular.ttf"));
  assert.ok(drawn.has("a".codePointAt(0) as number) && drawn.has("“".codePointAt(0) as number));
  assert.equal(keepDrawn("Zoë 🐙 loved it", drawn), "Zoë loved it");
  assert.equal(keepDrawn("प्रिया", drawn), "");
});
