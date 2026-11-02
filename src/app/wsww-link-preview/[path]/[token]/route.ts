import { LINK_PATHS, previewPageResponse } from "@/lib/wsww-preview-routes";
import type { LinkPath } from "@/lib/wsww-preview";

/* The page a link-preview fetcher reads for wsww.app/add/<token> and /f/<token>: src/proxy.ts
   rewrites only those fetchers here (board 20's og and twitter tags, nothing to run). */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ path: string; token: string }> }) {
  const { path, token } = await params;
  if (!LINK_PATHS.includes(path as LinkPath)) return new Response(null, { status: 404 });
  return previewPageResponse(req, path as LinkPath, token);
}
