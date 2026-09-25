/* Stand-in for @clerk/nextjs in the static (GitHub Pages) build, where there is no server and
   therefore no admin. The layout renders its provider as a plain passthrough. */
import type { ReactNode } from "react";
export function ClerkProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
export function SignIn() { return null; }
