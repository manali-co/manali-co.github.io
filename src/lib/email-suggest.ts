/* "Did you mean …?" for the waitlist: catches the typos DNS can't (gmailll.com and gmial.com
   are real, squatted domains) by comparing the address's domain with the providers people
   actually use. Pure and synchronous: no network, runs in the browser on blur and submit. */

const DOMAINS = [
  "gmail.com", "googlemail.com", "icloud.com", "me.com", "mac.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "ymail.com", "aol.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.de", "gmx.net", "mail.com",
  "zoho.com", "fastmail.com", "hey.com", "yandex.com", "comcast.net", "verizon.net", "att.net", "sbcglobal.net",
  "hotmail.co.uk", "yahoo.co.uk", "outlook.in", "yahoo.in", "rediffmail.com", "web.de", "orange.fr", "free.fr", "libero.it",
  "qq.com", "163.com", "hotmail.fr", "hotmail.de", "outlook.de", "live.co.uk", "yahoo.fr", "yahoo.de", "t-online.de",
  "btinternet.com", "sky.com",
];
/* Endings that are almost always a slip for the one on the right. */
const TLD_FIXES: Record<string, string> = { con: "com", cmo: "com", ocm: "com", comm: "com", vom: "com", xom: "com", cim: "com", nte: "net", nett: "net", ogr: "org", rog: "org" };

/* Optimal string alignment distance: edits, with a swapped pair of neighbours counting as one. */
export function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export type Suggestion = { email: string; domain: string };

/* A corrected address, or null when the domain looks fine (or we can't tell). */
export function suggestEmail(input: string): Suggestion | null {
  const email = input.trim();
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain.includes(".") || DOMAINS.includes(domain)) return null;

  // closest known provider; the shorter the name, the less we guess ("ma.com" stays as typed)
  let best: string | null = null, bestD = Infinity;
  for (const known of DOMAINS) {
    const dd = distance(domain, known);
    if (dd < bestD) { best = known; bestD = dd; }
  }
  const sld = domain.split(".")[0];
  const limit = sld.length <= 3 ? 0 : sld.length <= 5 ? 1 : 2;
  if (best && bestD <= limit) return { email: `${local}@${best}`, domain: best };

  // unknown provider, but the ending is a classic slip: company.con -> company.com
  const dot = domain.lastIndexOf(".");
  const fix = TLD_FIXES[domain.slice(dot + 1)];
  if (fix) { const fixed = `${domain.slice(0, dot)}.${fix}`; return { email: `${local}@${fixed}`, domain: fixed }; }
  return null;
}
