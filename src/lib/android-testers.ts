/* wsww.app/android, the Android closed test's sign-up (Claude Design: marketing/social/AndroidSignup).
   The check runs on submit, not while typing, and any Google account's email is fine, not only Gmail.
   A typo here means someone never gets in, so the common Gmail ones get a one-tap fix. */
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmal.com": "gmail.com",
  "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com", "gmail.om": "gmail.com",
};

export type EmailProblem = { err: "empty" | "invalid" } | { err: "typo"; fixed: string };

export function checkTesterEmail(value: string): EmailProblem | null {
  const s = value.trim();
  if (!s) return { err: "empty" };
  if (s.length > 254 || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s)) return { err: "invalid" };
  const at = s.lastIndexOf("@");
  const fix = TYPOS[s.slice(at + 1).toLowerCase()];
  return fix ? { err: "typo", fixed: s.slice(0, at + 1) + fix } : null;
}
