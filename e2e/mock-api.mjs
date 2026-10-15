// A stand-in for the What Should We Watch API's public link routes (POST /v1/links/read, react
// and keep, each with the token in the body), for the
// Playwright tests. The page calls the API from the server, so the browser can't intercept it;
// this tiny server answers instead and records what it was sent (GET /__log, POST /__reset).
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT || 7199);
const HOUR = 3600;
const now = () => Math.floor(Date.now() / 1000);

const film = (over = {}) => ({
  id: "tt5813916", title: "Paddington 2", year: 2017, runtimeMin: 103, service: "netflix",
  link: "https://www.netflix.com/title/80192014", posterUrl: null, trailerKey: null, ...over,
});
const from = { firstName: "Manali", avatar: { hue: "coral", shape: "pebble", face: "smile" } };

// Tokens are 22 characters of [A-Za-z0-9_-], like secrets.token_urlsafe(16).
const LINKS = {
  Q3v9mT2xK7pLwZ4rN8bYcA: { kind: "f", film: film(), from, note: "bring tissues", country: "us" },
  // User text that must stay text: markup, a script and a URL that must never become a link.
  XssNote0000000000000aa: {
    kind: "f",
    film: film({ title: "Past Lives", year: 2023, runtimeMin: 106 }),
    from: { firstName: "<i>Jo</i>", avatar: null },
    note: "<b>bring</b> tissues <script>window.__pwned=1</script> https://evil.example/x",
    country: "us",
  },
  NoNote000000000000000a: { kind: "f", film: film({ service: "max", link: "https://play.max.com/movie/abc" }), from, note: null, country: "us" },
};
const NOT_ENABLED = "NotEnabled000000000000";
const RATE_LIMITED = "RateLimited00000000000";

let log = [];
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      try {
        resolve(s ? JSON.parse(s) : null);
      } catch {
        resolve("<invalid json>");
      }
    });
  });

createServer(async (req, res) => {
  const url = new URL(req.url, "http://mock");
  if (url.pathname === "/__log") return send(res, 200, log);
  if (url.pathname === "/__reset") {
    log = [];
    return send(res, 200, { ok: true });
  }
  // The token travels in the JSON body, never in a URL (the API's request URLs are logged).
  const m = url.pathname.match(/^\/v1\/links\/(read|react|keep)$/);
  if (!m || req.method !== "POST") return send(res, 404, { code: "not_found", message: "Not found." });
  const action = m[1];
  const body = await readBody(req);
  log.push({ method: req.method, path: url.pathname, ip: req.headers["x-wsww-client-ip"] ?? null, body });
  const token = body && typeof body.token === "string" ? body.token : "";
  if (token === NOT_ENABLED) return send(res, 404, { code: "not_enabled", message: "Not enabled." });
  if (token === RATE_LIMITED) return send(res, 429, { code: "rate_limited", message: "Slow down." }, { "retry-after": "30" });
  const link = LINKS[token];
  // Unknown, expired, revoked and blocked links all get this one answer.
  if (!link) return send(res, 404, { code: "link_unavailable", message: "This link isn't available." });
  if (action === "read") return send(res, 200, { ...link, expiresAt: now() + 90 * 24 * HOUR });
  if (typeof body.webId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(body.webId)) return send(res, 400, { code: "bad_request", message: "webId" });
  if (action === "react") {
    if (!["liked", "okay", "not_for_me"].includes(body.reaction)) return send(res, 400, { code: "bad_request", message: "reaction" });
    return send(res, 200, { told: body.reaction !== "not_for_me", code: "KQ7W3D", codeExpiresAt: now() + 24 * HOUR });
  }
  return send(res, 200, { code: "KQ7W3D", codeExpiresAt: now() + 24 * HOUR });
}).listen(PORT, "127.0.0.1", () => console.log(`mock WSWW API on http://127.0.0.1:${PORT}`));
