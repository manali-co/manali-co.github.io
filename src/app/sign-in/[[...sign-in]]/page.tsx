import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { Picture } from "@/components/Picture";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/* Owner-only sign-in: one card, one button (Clerk renders it), a plain note. */
export default function SignInPage() {
  return (
    <section className="signin">
      <Picture light="/brand/mark-color.svg" dark="/brand/mark-on-dark.svg" alt="" className="signin__mark" width={56} height={56} />
      <div>
        <h1 className="signin__title">Sign in</h1>
        <p className="muted">This area is for the owner. If that&apos;s not you, the <a href="/blog/">blog</a> is the good part anyway.</p>
      </div>
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <SignIn appearance={{ variables: { colorPrimary: "#5B63C7", borderRadius: "999px" } }} /> : <p className="subscribe__status subscribe__status--err">Clerk isn&apos;t configured on this deployment yet.</p>}
      <p className="signin__note"><Icon name="shield" size={14} /> Auth by Clerk. We only see your GitHub login.</p>
    </section>
  );
}
