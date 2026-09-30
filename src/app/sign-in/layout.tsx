import type { ReactNode } from "react";
import { ClerkScope } from "@/lib/clerk-scope";

export default function SignInLayout({ children }: { children: ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}
