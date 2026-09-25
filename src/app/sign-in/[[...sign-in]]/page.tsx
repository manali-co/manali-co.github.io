import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <section className="signin">
      <h1 className="page-head__title">Sign in</h1>
      <p className="muted">This area is for the owner. If that&apos;s not you, the <a href="/blog/">blog</a> is the interesting part anyway.</p>
      <SignIn />
    </section>
  );
}
