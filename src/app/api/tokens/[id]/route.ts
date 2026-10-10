import { removeToken, buildSnapshot, setTokenMark } from "@/lib/event/repository";
import { normalizeTokenMark } from "@/lib/live-drawer/types";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { mark?: unknown };
    const mark =
      body.mark == null ? null : normalizeTokenMark(body.mark);
    if (body.mark != null && mark == null) return error("Unknown token mark");
    const snapshot = await setTokenMark(id, mark);
    return json({ ok: true, snapshot });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to update token", 500);
  }
}

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
