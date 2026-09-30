import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { githubAuthEnabled } from "@/lib/owner-session";
import { Picture } from "@/components/Picture";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "not-owner": "That GitHub account isn't the owner's. Nothing here for you, sorry.",
  expired: "That sign-in took too long or was opened twice. Try again.",
  github: "GitHub didn't answer the way we expected. Try again in a minute.",
  off: "GitHub sign-in isn't configured on this deployment yet.",
};

/* Owner-only sign-in: one card, one GitHub button, a plain note. The Clerk sign-in stays folded
   underneath only until GitHub sign-in has proven itself, then goes. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const github = githubAuthEnabled();
  return (
    <section className="signin">
      <Picture light="/brand/mark-color.svg" dark="/brand/mark-on-dark.svg" alt="" className="signin__mark" width={56} height={56} />
      <div>
        <h1 className="signin__title">Sign in</h1>
        <p className="muted">This area is for the owner. If that&apos;s not you, the <Link href="/blog/">blog</Link> is the good part anyway.</p>
      </div>
      {error && ERRORS[error] && <p className="subscribe__status subscribe__status--err" role="alert">{ERRORS[error]}</p>}
      {/* A form, not a Link: this must be a full navigation, never a prefetch that starts a sign-in. */}
      {github && <form action="/api/auth/signin/github/" method="get"><button className="button button--primary signin__github" type="submit"><Icon name="github" size={18} />Continue with GitHub</button></form>}
      {clerkEnabled && (github ? (
        <details className="signin__old"><summary>Use the old sign-in</summary><ClerkSignIn /></details>
      ) : <ClerkSignIn />)}
      {!github && !clerkEnabled && <p className="subscribe__status subscribe__status--err">Sign-in isn&apos;t configured on this deployment yet.</p>}
      <p className="signin__note"><Icon name="shield" size={14} /> We only see your GitHub login and its verified email.</p>
    </section>
  );
}

function ClerkSignIn() {
  return <SignIn appearance={{
    variables: { colorPrimary: "#5B63C7", borderRadius: "12px", fontFamily: "var(--font-body)" },
    elements: {
      cardBox: { boxShadow: "none", border: "1px solid var(--border)", borderRadius: "16px", width: "100%" },
      socialButtonsBlockButton: { borderRadius: "999px" },
      formButtonPrimary: { borderRadius: "999px" },
    },
  }} />;
}
