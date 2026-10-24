import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as aasa } from "../app/.well-known/apple-app-site-association/route";
import proxy, { config } from "../proxy";

/* wsww.app's universal links: the AASA file iOS reads, and the fallback for a phone without the app. */

const aasaReq = (host: string) => new Request(`https://${host}/.well-known/apple-app-site-association`, { headers: { host } });
const req = (url: string) => new NextRequest(url, { headers: { host: new URL(url).host } });

test("wsww.app serves the AASA file as JSON for the app's /add/ and /f/ links only", async () => {
  const res = aasa(aasaReq("wsww.app"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/json");
  assert.equal(res.headers.get("location"), null);
  assert.deepEqual(await res.json(), {
    applinks: {
      details: [
        {
          appIDs: ["W6RL988KTP.co.manali.wsww"],
          components: [
            { "/": "/add/*", comment: "A friend invite" },
            { "/": "/f/*", comment: "A film someone sent" },
          ],
        },
      ],
    },
  });
});

test("manali.page has no AASA file", () => {
  for (const host of ["manali.page", "www.manali.page", "MANALI.PAGE:443"]) assert.equal(aasa(aasaReq(host)).status, 404, host);
});

test("wsww.app/add/<token> and /f/<token> go home with a 307, no token or query, never cached", async () => {
  for (const url of [
    "https://wsww.app/add/tok_AbC123",
    "https://wsww.app/add/tok_AbC123/",
    "https://wsww.app/f/tok_AbC123?utm_source=imessage&t=tok_AbC123",
    "https://wsww.app/f/tok_AbC123/card",
    "https://wsww.app/add",
    "https://wsww.app/f/",
  ]) {
    const res = await proxy(req(url));
    assert.ok(res, url);
    assert.equal(res.status, 307, url);
    assert.equal(res.headers.get("location"), "https://wsww.app/", url);
    assert.equal(res.headers.get("cache-control"), "no-store", url);
  }
});

test("the same paths on manali.page fall through to the site (its 404)", async () => {
  for (const url of ["https://manali.page/add/tok_AbC123", "https://manali.page/f/tok_AbC123/", "https://www.manali.page/f/x"]) {
    assert.equal(await proxy(req(url)), undefined, url);
  }
});

test("only /add and /f themselves redirect, not paths that start with the same letters", async () => {
  for (const url of ["https://wsww.app/favicon.ico", "https://wsww.app/additional/", "https://wsww.app/films/x"]) {
    assert.equal(await proxy(req(url)), undefined, url);
  }
});

test("the proxy runs on /add/ and /f/ (the matcher), and the AASA path stays outside it", () => {
  assert.ok(config.matcher.includes("/add/:path*"));
  assert.ok(config.matcher.includes("/f/:path*"));
  assert.ok(!config.matcher.some((m) => m.includes("well-known")));
});
