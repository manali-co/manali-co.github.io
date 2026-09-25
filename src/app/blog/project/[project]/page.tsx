import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotesView, FILTERS, type Filter } from "@/components/NotesView";
import { projectLabel } from "@/lib/site";

const PROJECTS = FILTERS.filter((f) => f !== "all");

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ project }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ project: string }> }): Promise<Metadata> {
  const { project } = await params;
  return { title: `Notes · ${projectLabel[project] || project}` };
}

export default async function BlogByProject({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  if (!(PROJECTS as readonly string[]).includes(project)) notFound();
  return <NotesView filter={project as Filter} />;
}
