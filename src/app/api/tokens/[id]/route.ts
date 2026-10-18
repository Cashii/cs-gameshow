import {
  removeToken,
  buildSnapshot,
  updateTokenFields,
} from "@/lib/event/repository";
import { normalizeTokenMark, normalizeTokenNote } from "@/lib/live-drawer/types";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("operator", "hostess");
  if (isErrorResponse(session)) return session;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { mark?: unknown; note?: unknown };
    const fields: {
      mark?: ReturnType<typeof normalizeTokenMark>;
      note?: string | null;
    } = {};
    if ("mark" in body && session.role === "operator") {
      const mark =
        body.mark == null ? null : normalizeTokenMark(body.mark);
      if (body.mark != null && mark == null) return error("Unknown token mark");
      fields.mark = mark;
    }
    if ("note" in body) {
      fields.note = normalizeTokenNote(body.note);
    }
    if (!("mark" in fields) && !("note" in fields)) {
      return error(
        session.role === "hostess" ? "note required" : "mark or note required",
      );
    }
    const snapshot = await updateTokenFields(id, fields);
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
