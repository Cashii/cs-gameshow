import {
  castTriviaVote,
  triviaDeclareWinners,
  triviaLock,
  triviaNextQuestion,
  triviaOpen,
  triviaResetSeries,
  triviaReveal,
  triviaSaveQueue,
  triviaSetup,
  triviaUndoReveal,
} from "@/lib/trivia/store";
import { isTriviaChoiceId } from "@/lib/trivia/types";
import { error, isErrorResponse, json, requireRole } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    roundId?: string;
    choiceId?: string;
    deviceId?: string;
    question?: string;
    optionA?: string;
    optionB?: string;
    survivingChoiceId?: string;
    queue?: unknown;
  };

  if (body.action === "vote") {
    if (!body.roundId || !body.choiceId) {
      return error("roundId and choiceId required");
    }
    if (!body.deviceId?.trim()) return error("deviceId required");
    try {
      const snapshot = await castTriviaVote(
        body.roundId,
        body.choiceId,
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
    switch (body.action) {
      case "setup":
        return json(
          await triviaSetup({
            question: body.question ?? "",
            optionA: body.optionA ?? "",
            optionB: body.optionB ?? "",
          }),
        );
      case "open":
        return json(
          await triviaOpen({
            question: body.question ?? "",
            optionA: body.optionA ?? "",
            optionB: body.optionB ?? "",
          }),
        );
      case "lock":
        return json(await triviaLock());
      case "reveal": {
        if (!isTriviaChoiceId(body.survivingChoiceId)) {
          return error("survivingChoiceId must be a or b");
        }
        return json(await triviaReveal(body.survivingChoiceId));
      }
      case "undoReveal":
        return json(await triviaUndoReveal());
      case "nextQuestion":
        return json(await triviaNextQuestion());
      case "declareWinners":
        return json(await triviaDeclareWinners());
      case "saveQueue":
        if (!Array.isArray(body.queue)) return error("queue required");
        return json(await triviaSaveQueue(body.queue));
      case "resetSeries":
        return json(await triviaResetSeries());
      default:
        return error("Invalid action");
    }
  } catch (e) {
    return error(e instanceof Error ? e.message : "Trivia action failed", 400);
  }
}
