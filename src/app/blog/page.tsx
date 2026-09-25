import type { Metadata } from "next";
import { NotesView } from "@/components/NotesView";

export const metadata: Metadata = {
  title: "Notes",
  description: "Progress notes from Manali Apps: each project as it moves. Written by people and, now and then, by the coding agents doing the work.",
};

export default function Blog() {
  return <NotesView filter="all" />;
}
