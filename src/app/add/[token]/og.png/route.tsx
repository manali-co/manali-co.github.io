import { previewImageResponse } from "@/lib/wsww-preview-routes";

/* wsww.app/add/<token>/og.png: a friend invite's preview image (board 20 frames 1 and 5). */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  return previewImageResponse(req, "add", (await params).token);
}
