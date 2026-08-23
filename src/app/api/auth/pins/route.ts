import { updatePins } from "@/lib/event/repository";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const body = (await request.json()) as {
      operator?: string;
      hostess?: string;
    };
    await updatePins(body);
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to update PINs", 500);
  }
}
