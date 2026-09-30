/* The owner's session for /admin: a GitHub sign-in (see src/app/api/auth/*), kept as a signed,
   host-only cookie. No auth vendor, no third-party script, nothing shared with the apps' sign-in.
   The cookie holds who signed in and until when, HMAC-signed with AUTH_SECRET; the GitHub token is
   used once to read the verified emails and never stored. Web Crypto only, so the proxy can check
   it too. */

export const OWNER_COOKIE = "__Host-manali-owner";
export const STATE_COOKIE = "__Host-manali-oauth";
export const SESSION_DAYS = 7;

export type OwnerSession = { login: string; name: string; email: string; exp: number };

export const githubAuthEnabled = () =>
  !!process.env.AUTH_GITHUB_ID && !!process.env.AUTH_GITHUB_SECRET && (process.env.AUTH_SECRET || "").length >= 32;

/* Owner emails. A GitHub email counts only when GitHub says it's verified. */
export const ownerEmails = () => (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.AUTH_SECRET || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signSession(s: Omit<OwnerSession, "exp">): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...s, exp: Date.now() + SESSION_DAYS * 86400_000 })));
  return `${body}.${b64url(await hmac(body))}`;
}

/* The session in a cookie value, or null if it's missing, forged, expired, or its email has since
   left the owner list. */
export async function readSession(token: string | undefined): Promise<OwnerSession | null> {
  if (!token || !githubAuthEnabled()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!sameBytes(unb64url(sig), await hmac(body))) return null;
    const s = JSON.parse(new TextDecoder().decode(unb64url(body))) as OwnerSession;
    if (typeof s.exp !== "number" || s.exp < Date.now()) return null;
    return ownerEmails().includes(String(s.email).toLowerCase()) ? s : null;
  } catch {
    return null;
  }
}

export function randomState() {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export function sameState(a: string, b: string) {
  return sameBytes(enc.encode(a), enc.encode(b));
}
