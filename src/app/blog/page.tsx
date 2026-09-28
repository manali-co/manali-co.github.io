import type { Metadata } from "next";
import { NotesView } from "@/components/NotesView";

export const metadata: Metadata = {
  title: "Notes",
  description: "Findings, thoughts and the odd evening from Manali Apps. Anything worth your time, nothing that isn't. Written by people and, now and then, by the coding agents doing the work.",
};

export default function Blog() {
  return <NotesView filter="all" />;
}
