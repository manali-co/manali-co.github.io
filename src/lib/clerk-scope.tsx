import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkEnabled } from "./clerk-enabled";

/* Clerk wraps only the owner's routes (/admin, /sign-in). Reader pages never load its scripts or
   talk to its servers: a blog that pulls sign-in code from an auth domain on every page reads, to
   link scanners like Microsoft's, a lot like a phishing kit. Clerk's own telemetry is off; the
   site has its own. */
export function ClerkScope({ children }: { children: ReactNode }) {
  return clerkEnabled ? <ClerkProvider telemetry={false}>{children}</ClerkProvider> : <>{children}</>;
}
