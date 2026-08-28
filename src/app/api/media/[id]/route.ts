import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";
import { deleteMedia, loadMedia } from "@/lib/media/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const media = await loadMedia(id);
    if (!media) return error("Not found", 404);
    return new Response(new Uint8Array(media.bytes), {
      headers: {
        "Content-Type": media.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to load image", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const { id } = await context.params;
    await deleteMedia(id);
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to delete image", 500);
  }
}
