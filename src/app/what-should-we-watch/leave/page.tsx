import type { Metadata } from "next";
import { Suspense } from "react";
import { WsswLeave } from "@/components/WsswLeave";

export const metadata: Metadata = {
  title: { absolute: "Leave the waitlist · What Should We Watch" },
  robots: { index: false, follow: false },
  alternates: { canonical: "/what-should-we-watch/leave/" },
};

export default function Leave() {
  return <Suspense fallback={null}><WsswLeave /></Suspense>;
}
