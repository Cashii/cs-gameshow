import {
  castTakeItPick,
  getTakeItMe,
  resetTakeItRound,
  startTakeItRound,
} from "@/lib/take-it-or-leave-it/picks";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId") ?? "";
  if (!deviceId.trim()) return error("deviceId required");
  try {
    const me = await getTakeItMe(deviceId.trim());
    return json(me);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Status failed", 400);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    roundId?: string;
    caseId?: number;
    deviceId?: string;
  };

  if (body.action === "pick") {
    if (!body.roundId || body.caseId == null) {
      return error("roundId and caseId required");
    }
    if (!body.deviceId?.trim()) return error("deviceId required");
    try {
      const snapshot = await castTakeItPick(
        body.roundId,
        Number(body.caseId),
        body.deviceId.trim(),
      );
      return json(snapshot);
    } catch (e) {
      return error(e instanceof Error ? e.message : "Pick failed", 400);
    }
  }

  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    if (body.action === "start") {
      return json(await startTakeItRound());
    }
    if (body.action === "reset") {
      return json(await resetTakeItRound());
    }
    return error("Invalid action");
  } catch (e) {
    return error(e instanceof Error ? e.message : "Take It action failed", 400);
  }
}
