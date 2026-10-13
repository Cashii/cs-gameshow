import {
  drawTokens,
  clearReveal,
  undoLastBatch,
  returnTokensToPool,
  clearCalled,
} from "@/lib/event/repository";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    const body = (await request.json()) as {
      action?: "draw" | "clear" | "undo" | "return" | "clearCalled";
      colorCounts?: { colorId: string; count: number }[];
      anyCount?: number;
      tokenIds?: string[];
    };

    if (body.action === "clear") {
      const snapshot = await clearReveal();
      return json(snapshot);
    }
    if (body.action === "undo") {
      const snapshot = await undoLastBatch();
      return json(snapshot);
    }
    if (body.action === "return") {
      const snapshot = await returnTokensToPool(body.tokenIds);
      return json(snapshot);
    }
    if (body.action === "clearCalled") {
      const snapshot = await clearCalled();
      return json(snapshot);
    }
    if (body.action === "draw") {
      const anyCount =
        typeof body.anyCount === "number" && Number.isFinite(body.anyCount)
          ? Math.max(0, Math.floor(body.anyCount))
          : 0;
      const snapshot = await drawTokens({
        colorCounts: body.colorCounts,
        anyCount,
        tokenIds: body.tokenIds,
      });
      return json(snapshot);
    }
    return error("Invalid action");
  } catch (e) {
    return error(e instanceof Error ? e.message : "Draw failed", 500);
  }
}
