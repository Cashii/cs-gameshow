import { removeToken, buildSnapshot } from "@/lib/event/repository";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("operator", "hostess");
  if (isErrorResponse(session)) return session;

  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    await removeToken(id, {
      number: url.searchParams.get("number") ?? undefined,
      colorId: url.searchParams.get("colorId") ?? undefined,
    });
    const snapshot = await buildSnapshot();
    return json({ ok: true, snapshot });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to remove token", 500);
  }
}
