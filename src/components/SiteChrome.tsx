"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isPrivateLinkPath } from "@/lib/wsww-link";

/* The site's header, skip link and footer, left out on What Should We Watch's link pages
   (wsww.app/f/<token>, later /g/ and /j/): the design draws those as standalone pages with only
   their own "What Should We Watch · wsww.app" header. Deciding here, by path, keeps every other
   page static (the root layout never reads the request). */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname && isPrivateLinkPath(pathname) ? null : <>{children}</>;
}
