import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";
import { MAX_MEDIA_BYTES, saveMedia } from "@/lib/media/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return error("Image file required");
    }
    if (file.size > MAX_MEDIA_BYTES) {
      return error("Image is too large");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveMedia({
      mimeType: file.type || "image/jpeg",
      bytes,
    });
    return json(saved);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Upload failed", 500);
  }
}
