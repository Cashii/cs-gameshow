import {
  updatePoll,
  resetPollVotes,
  castVote,
  snapshotPollForHistory,
  updateEventSuite,
  ensureEvent,
} from "@/lib/event/repository";
import {
  createEmptyPoll,
  withArchivedPoll,
} from "@/lib/poll/types";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    question?: string;
    choices?: { id: string; text: string }[];
    pollId?: string;
    choiceId?: string;
    deviceId?: string;
    displayName?: string;
    userAgent?: string;
  };

  if (body.action === "vote") {
    if (!body.pollId || !body.choiceId) return error("pollId and choiceId required");
    const deviceId = body.deviceId;
    if (!deviceId?.trim()) return error("deviceId required");
    try {
      const snapshot = await castVote(
        body.pollId,
        deviceId.trim(),
        body.choiceId,
        body.displayName,
        body.userAgent,
      );
      return json(snapshot);
    } catch (e) {
      return error(e instanceof Error ? e.message : "Vote failed", 400);
    }
  }

  const session = await requireRole("operator");
  if (isErrorResponse(session)) return session;

  try {
    switch (body.action) {
      case "setup": {
        const choices = (body.choices ?? []).slice(0, 6);
        if (choices.length < 2) return error("At least 2 choices required");
        const event = await ensureEvent();
        const archived = event.poll?.id
          ? await snapshotPollForHistory(event.poll)
          : null;
        if (event.poll?.id) await resetPollVotes(event.poll.id);
        const pollId = crypto.randomUUID();
        const snapshot = await updateEventSuite((prev) => ({
          ...prev,
          pollHistory: archived
            ? withArchivedPoll(prev.pollHistory, archived)
            : prev.pollHistory ?? [],
          poll: {
            id: pollId,
            question: body.question?.trim() || "Question?",
            choices: choices.map((c, i) => ({
              id: c.id || String.fromCharCode(97 + i),
              text: c.text.trim() || `Option ${i + 1}`,
              votes: 0,
            })),
            status: "idle",
            voteLog: [],
          },
        }));
        return json(snapshot);
      }
      case "open": {
        const event = await ensureEvent();
        const incomingChoices = (body.choices ?? []).slice(0, 6);
        const archived = event.poll?.id
          ? await snapshotPollForHistory(event.poll)
          : null;
        if (event.poll?.id) await resetPollVotes(event.poll.id);
        const snapshot = await updateEventSuite((prev) => {
          const hasIncoming = incomingChoices.length >= 2;
          const nextId = crypto.randomUUID();
          return {
            ...prev,
            pollHistory: archived
              ? withArchivedPoll(prev.pollHistory, archived)
              : prev.pollHistory ?? [],
            poll: {
              id: nextId,
              question:
                body.question?.trim() ||
                prev.poll.question.trim() ||
                "Question?",
              choices: hasIncoming
                ? incomingChoices.map((c, i) => ({
                    id: c.id || String.fromCharCode(97 + i),
                    text: c.text.trim() || `Option ${i + 1}`,
                    votes: 0,
                  }))
                : prev.poll.choices.map((c) => ({ ...c, votes: 0 })),
              status: "open" as const,
              voteLog: [],
            },
          };
        });
        return json(snapshot);
      }
      case "close": {
        const snapshot = await updatePoll((prev) => ({
          ...prev,
          status: "closed",
        }));
        return json(snapshot);
      }
      case "results": {
        const snapshot = await updatePoll((prev) => ({
          ...prev,
          status: "results",
        }));
        return json(snapshot);
      }
      case "clear": {
        const event = await ensureEvent();
        const archived = event.poll?.id
          ? await snapshotPollForHistory(event.poll)
          : null;
        if (event.poll?.id) await resetPollVotes(event.poll.id);
        const snapshot = await updateEventSuite((prev) => ({
          ...prev,
          pollHistory: archived
            ? withArchivedPoll(prev.pollHistory, archived)
            : prev.pollHistory ?? [],
          poll: createEmptyPoll(),
        }));
        return json(snapshot);
      }
      default:
        return error("Invalid action");
    }
  } catch (e) {
    return error(e instanceof Error ? e.message : "Poll action failed", 500);
  }
}
