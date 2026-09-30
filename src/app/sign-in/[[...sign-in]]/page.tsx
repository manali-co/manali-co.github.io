import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { Picture } from "@/components/Picture";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

/* Owner-only sign-in: one card, one button (Clerk renders it), a plain note. */
export default function SignInPage() {
  return (
    <section className="signin">
      <Picture light="/brand/mark-color.svg" dark="/brand/mark-on-dark.svg" alt="" className="signin__mark" width={56} height={56} />
      <div>
        <h1 className="signin__title">Sign in</h1>
        <p className="muted">This area is for the owner. If that&apos;s not you, the <Link href="/blog/">blog</Link> is the good part anyway.</p>
      </div>
      {clerkEnabled ? <SignIn appearance={{
        variables: { colorPrimary: "#5B63C7", borderRadius: "12px", fontFamily: "var(--font-body)" },
        elements: {
          cardBox: { boxShadow: "none", border: "1px solid var(--border)", borderRadius: "16px", width: "100%" },
          socialButtonsBlockButton: { borderRadius: "999px" },
          formButtonPrimary: { borderRadius: "999px" },
        },
      }} /> : <p className="subscribe__status subscribe__status--err">Clerk isn&apos;t configured on this deployment yet.</p>}
      <p className="signin__note"><Icon name="shield" size={14} /> Auth by Clerk. We only see your GitHub login.</p>
    </section>
  );
}
