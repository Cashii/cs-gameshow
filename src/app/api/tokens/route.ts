import {
  addTokens,
  buildSnapshot,
  clearPool,
  replacePoolWithSaved,
} from "@/lib/event/repository";
import type { LiveDrawerSavedToken } from "@/lib/live-drawer/types";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireRole("operator", "hostess");
  if (isErrorResponse(session)) return session;

  try {
    const body = (await request.json()) as {
      tokens?: { number: string; colorId: string }[];
    };
    if (!body.tokens?.length) return error("tokens array required");
    const result = await addTokens(body.tokens);
    const snapshot = await buildSnapshot();
    return json({ ...result, snapshot });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to add tokens", 500);
  }
}

export async function PUT(request: Request) {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const body = (await request.json()) as {
      tokens?: LiveDrawerSavedToken[];
    };
    if (!Array.isArray(body.tokens)) return error("tokens array required");
    const snapshot = await replacePoolWithSaved(body.tokens);
    return json({ ok: true, snapshot });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to load token list", 500);
  }
}

export async function DELETE() {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const snapshot = await clearPool();
    return json({ ok: true, snapshot });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to clear pool", 500);
  }
}
