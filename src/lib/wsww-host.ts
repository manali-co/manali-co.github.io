/* wsww.app and manali.page are one Vercel deployment; the Host header tells them apart (the same
   header next.config's `has: host` rules match on). */
const MANALI_HOSTS = new Set(["manali.page", "www.manali.page"]);
const hostOf = (h: Headers) => (h.get("host") || "").split(":")[0].toLowerCase();

export const isWswwHost = (h: Headers) => hostOf(h) === "wsww.app";
export const isManaliHost = (h: Headers) => MANALI_HOSTS.has(hostOf(h));
