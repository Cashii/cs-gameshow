import {
  castDerbyVote,
  clearDerbyVotes,
  getDerbyVoteStatus,
} from "@/lib/derby/votes";
import {
  createDefaultDerbyState,
  emptyDerbyVoteTallies,
} from "@/lib/derby/types";
import { ensureEvent, updateEventSuite } from "@/lib/event/repository";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raceId = searchParams.get("raceId") ?? "";
  const deviceId = searchParams.get("deviceId") ?? "";
  if (!raceId || !deviceId.trim()) {
    return error("raceId and deviceId required");
  }
  try {
    const status = await getDerbyVoteStatus(raceId, deviceId.trim());
    return json(status);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Status failed", 400);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    raceId?: string;
    racerId?: string;
    deviceId?: string;
  };

  if (body.action === "vote") {
    if (!body.raceId || !body.racerId) {
      return error("raceId and racerId required");
    }
    if (!body.deviceId?.trim()) return error("deviceId required");
    try {
      const snapshot = await castDerbyVote(
        body.raceId,
        body.racerId,
        body.deviceId.trim(),
      );
      return json(snapshot);
    } catch (e) {
      return error(e instanceof Error ? e.message : "Vote failed", 400);
    }
  }

  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    if (body.action === "clearVotes") {
      const event = await ensureEvent();
      const derby = event.derby ?? createDefaultDerbyState();
      await clearDerbyVotes(derby.raceId);
      const snapshot = await updateEventSuite((prev) => ({
        ...prev,
        derby: {
          ...(prev.derby ?? createDefaultDerbyState()),
          voteTallies: emptyDerbyVoteTallies(),
        },
      }));
      return json(snapshot);
    }
    return error("Invalid action");
  } catch (e) {
    return error(e instanceof Error ? e.message : "Derby action failed", 400);
  }
}
