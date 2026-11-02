import { previewImageResponse } from "@/lib/wsww-preview-routes";

/* wsww.app/f/<token>/og.jpg: a sent film's preview image (board 20 frames 2, 3 and 6), JPEG: its poster is a photo. */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  return previewImageResponse(req, "f", (await params).token);
}
