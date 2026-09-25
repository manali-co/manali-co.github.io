"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/* The confirm link redirects back with ?confirmed=1|0. Read on the client so the page stays static. */
function Note() {
  const confirmed = useSearchParams().get("confirmed");
  if (confirmed === "1") return <p className="subscribe__status subscribe__status--ok" role="status">Confirmed. You&apos;re in; the next post lands in your inbox.</p>;
  if (confirmed === "0") return <p className="subscribe__status subscribe__status--err" role="status">That confirmation link didn&apos;t work. It may have been used already; try subscribing again.</p>;
  return null;
}
export function ConfirmedNote() {
  return <Suspense fallback={null}><Note /></Suspense>;
}
