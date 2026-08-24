import { ObjectId, type Collection, type Db } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { EVENT_ID } from "@/lib/suite-state";
import { getDeviceCode } from "@/lib/player/device-id";
import {
  createDefaultTriviaState,
  isTriviaChoiceId,
  type TriviaChoiceId,
  type TriviaGameState,
  type TriviaMe,
  type TriviaPlayerRole,
} from "@/lib/trivia/types";
import {
  ensureEvent,
  updateEventSuite,
} from "@/lib/event/repository";
import type { EventSnapshot } from "@/lib/suite-state";

type TriviaVoteDoc = {
  _id: ObjectId;
  eventId: string;
  roundId: string;
  deviceId: string;
  choiceId: TriviaChoiceId;
  playerCode: string;
  createdAt: Date;
};

type TriviaPlayerDoc = {
  _id: ObjectId;
  eventId: string;
  deviceId: string;
  playerCode: string;
  status: "active" | "eliminated";
  joinedRound: number;
  eliminatedRound: number | null;
};

async function votesCol(db: Db): Promise<Collection<TriviaVoteDoc>> {
  return db.collection<TriviaVoteDoc>("triviaVotes");
}

async function playersCol(db: Db): Promise<Collection<TriviaPlayerDoc>> {
  return db.collection<TriviaPlayerDoc>("triviaPlayers");
}

export async function ensureTriviaIndexes(): Promise<void> {
  const db = await getDb();
  await votesCol(db).then((c) =>
    c.createIndex({ eventId: 1, roundId: 1, deviceId: 1 }, { unique: true }),
  );
  await votesCol(db).then((c) => c.createIndex({ eventId: 1, roundId: 1 }));
  await playersCol(db).then((c) =>
    c.createIndex({ eventId: 1, deviceId: 1 }, { unique: true }),
  );
  await playersCol(db).then((c) => c.createIndex({ eventId: 1, status: 1 }));
}

function fieldNotSetYet(trivia: TriviaGameState): boolean {
  return (
    trivia.roundIndex <= 1 &&
    trivia.status !== "revealed" &&
    trivia.status !== "finished"
  );
}

export async function refreshTriviaCounts(
  trivia: TriviaGameState,
): Promise<TriviaGameState> {
  if (!trivia.roundId || trivia.status === "idle") {
    const db = await getDb();
    const remainingCount = fieldNotSetYet(trivia)
      ? trivia.remainingCount
      : await playersCol(db).then((c) =>
          c.countDocuments({ eventId: EVENT_ID, status: "active" }),
        );
    return {
      ...trivia,
      answeredCount: 0,
      choiceACount: 0,
      choiceBCount: 0,
      remainingCount,
    };
  }

  const db = await getDb();
  const counts = await votesCol(db).then((c) =>
    c
      .aggregate<{ _id: TriviaChoiceId; count: number }>([
        { $match: { eventId: EVENT_ID, roundId: trivia.roundId } },
        { $group: { _id: "$choiceId", count: { $sum: 1 } } },
      ])
      .toArray(),
  );
  const map = new Map(counts.map((row) => [row._id, row.count]));
  const choiceACount = map.get("a") ?? 0;
  const choiceBCount = map.get("b") ?? 0;
  const remainingCount = fieldNotSetYet(trivia)
    ? 0
    : await playersCol(db).then((c) =>
        c.countDocuments({ eventId: EVENT_ID, status: "active" }),
      );

  return {
    ...trivia,
    answeredCount: choiceACount + choiceBCount,
    choiceACount,
    choiceBCount,
    remainingCount,
    winnerCodes: trivia.status === "finished" ? trivia.winnerCodes : [],
  };
}

export type { TriviaMe } from "@/lib/trivia/types";

export async function getTriviaMe(deviceId: string): Promise<TriviaMe> {
  const event = await ensureEvent();
  const trivia = event.trivia ?? createDefaultTriviaState();
  const db = await getDb();
  const player = await playersCol(db).then((c) =>
    c.findOne({ eventId: EVENT_ID, deviceId }),
  );
  const vote = trivia.roundId
    ? await votesCol(db).then((c) =>
        c.findOne({
          eventId: EVENT_ID,
          roundId: trivia.roundId,
          deviceId,
        }),
      )
    : null;

  let role: TriviaPlayerRole = "none";
  if (player?.status === "active") role = "active";
  else if (player?.status === "eliminated") role = "eliminated";

  const isRoundOne = trivia.roundIndex <= 1;
  const canVote =
    trivia.status === "open" &&
    !vote &&
    (isRoundOne ? role !== "eliminated" : role === "active");

  return {
    role,
    canVote,
    voted: Boolean(vote),
    choiceId: vote?.choiceId ?? null,
    remainingCount: trivia.remainingCount,
    winner: trivia.status === "finished" && role === "active",
  };
}

export async function getTriviaRoster(): Promise<{
  remaining: string[];
  remainingCount: number;
}> {
  const db = await getDb();
  const players = await playersCol(db).then((c) =>
    c
      .find({ eventId: EVENT_ID, status: "active" })
      .project({ playerCode: 1 })
      .sort({ playerCode: 1 })
      .toArray(),
  );
  return {
    remaining: players.map((p) => p.playerCode),
    remainingCount: players.length,
  };
}

function isDupKey(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

export async function castTriviaVote(
  roundId: string,
  choiceId: string,
  deviceId: string,
): Promise<EventSnapshot> {
  if (!isTriviaChoiceId(choiceId)) throw new Error("Invalid choice");
  const trimmed = deviceId.trim();
  if (!trimmed) throw new Error("deviceId required");

  const event = await ensureEvent();
  const trivia = event.trivia ?? createDefaultTriviaState();
  if (trivia.status !== "open" || trivia.roundId !== roundId) {
    throw new Error("Voting is not open");
  }

  const db = await getDb();
  const player = await playersCol(db).then((c) =>
    c.findOne({ eventId: EVENT_ID, deviceId: trimmed }),
  );
  const isRoundOne = trivia.roundIndex <= 1;
  if (!isRoundOne && player?.status !== "active") {
    throw new Error("You are not in this round");
  }
  if (player?.status === "eliminated") {
    throw new Error("You are eliminated");
  }

  try {
    await votesCol(db).then((c) =>
      c.insertOne({
        _id: new ObjectId(),
        eventId: EVENT_ID,
        roundId,
        deviceId: trimmed,
        choiceId,
        playerCode: getDeviceCode(trimmed),
        createdAt: new Date(),
      }),
    );
  } catch (err) {
    if (isDupKey(err)) throw new Error("You already answered this question");
    throw err;
  }

  return updateEventSuite((prev) => prev);
}

export async function triviaSetup(input: {
  question: string;
  optionA: string;
  optionB: string;
}): Promise<EventSnapshot> {
  return updateEventSuite((prev) => {
    const t = prev.trivia ?? createDefaultTriviaState();
    if (t.status === "open" || t.status === "locked") {
      throw new Error("Finish the current vote first");
    }
    if (t.status === "revealed" && t.remainingCount > 1) {
      throw new Error("Start the next question first");
    }
    if (t.status === "finished") {
      throw new Error("Reset the series to play again");
    }
    const roundIndex = t.roundIndex === 0 ? 1 : t.roundIndex;
    return {
      ...prev,
      trivia: {
        ...t,
        status: "idle",
        roundId: t.roundId || crypto.randomUUID(),
        roundIndex,
        question: input.question.trim() || t.question || "True or false?",
        optionA: input.optionA.trim() || t.optionA || "True",
        optionB: input.optionB.trim() || t.optionB || "False",
        survivingChoiceId: null,
      },
    };
  });
}

export async function triviaOpen(input: {
  question: string;
  optionA: string;
  optionB: string;
}): Promise<EventSnapshot> {
  return updateEventSuite((prev) => {
    const t = prev.trivia ?? createDefaultTriviaState();
    if (t.status === "open") throw new Error("Voting is already open");
    if (t.status === "locked") throw new Error("Voting is locked — reveal or undo");
    if (t.status === "revealed" && t.remainingCount > 1) {
      throw new Error("Start the next question first");
    }
    if (t.status === "finished") {
      throw new Error("Reset the series to play again");
    }
    const roundIndex = t.roundIndex === 0 ? 1 : t.roundIndex;
    return {
      ...prev,
      trivia: {
        ...t,
        status: "open",
        roundId: t.roundId || crypto.randomUUID(),
        roundIndex,
        question: input.question.trim() || t.question || "True or false?",
        optionA: input.optionA.trim() || t.optionA || "True",
        optionB: input.optionB.trim() || t.optionB || "False",
        survivingChoiceId: null,
      },
    };
  });
}

export async function triviaLock(): Promise<EventSnapshot> {
  return updateEventSuite((prev) => {
    const t = prev.trivia ?? createDefaultTriviaState();
    if (t.status !== "open") throw new Error("Voting is not open");
    return { ...prev, trivia: { ...t, status: "locked" } };
  });
}

export async function triviaReveal(
  survivingChoiceId: TriviaChoiceId,
): Promise<EventSnapshot> {
  const event = await ensureEvent();
  const trivia = event.trivia ?? createDefaultTriviaState();
  if (trivia.status !== "locked") throw new Error("Lock voting before revealing");
  if (!trivia.roundId) throw new Error("No active round");

  const db = await getDb();
  const votes = await votesCol(db).then((c) =>
    c.find({ eventId: EVENT_ID, roundId: trivia.roundId }).toArray(),
  );
  const voteByDevice = new Map(votes.map((v) => [v.deviceId, v]));

  if (trivia.roundIndex <= 1) {
    await playersCol(db).then((c) => c.deleteMany({ eventId: EVENT_ID }));
    if (votes.length > 0) {
      await playersCol(db).then((c) =>
        c.insertMany(
          votes.map((vote) => ({
            _id: new ObjectId(),
            eventId: EVENT_ID,
            deviceId: vote.deviceId,
            playerCode: vote.playerCode,
            status:
              vote.choiceId === survivingChoiceId
                ? ("active" as const)
                : ("eliminated" as const),
            joinedRound: 1,
            eliminatedRound:
              vote.choiceId === survivingChoiceId ? null : 1,
          })),
        ),
      );
    }
  } else {
    const active = await playersCol(db).then((c) =>
      c.find({ eventId: EVENT_ID, status: "active" }).toArray(),
    );
    const toEliminate = active.filter((p) => {
      const vote = voteByDevice.get(p.deviceId);
      return !vote || vote.choiceId !== survivingChoiceId;
    });
    if (toEliminate.length > 0) {
      await playersCol(db).then((c) =>
        c.updateMany(
          { _id: { $in: toEliminate.map((p) => p._id) } },
          {
            $set: {
              status: "eliminated",
              eliminatedRound: trivia.roundIndex,
            },
          },
        ),
      );
    }
  }

  const remainingCount = await playersCol(db).then((c) =>
    c.countDocuments({ eventId: EVENT_ID, status: "active" }),
  );
  const fieldSize =
    trivia.roundIndex <= 1 ? remainingCount : trivia.fieldSize || remainingCount;

  return updateEventSuite((prev) => ({
    ...prev,
    trivia: {
      ...prev.trivia,
      status: "revealed",
      survivingChoiceId,
      remainingCount,
      fieldSize,
      winnerCodes: [],
    },
  }));
}

export async function triviaUndoReveal(): Promise<EventSnapshot> {
  const event = await ensureEvent();
  const trivia = event.trivia ?? createDefaultTriviaState();
  if (trivia.status === "finished") {
    return updateEventSuite((prev) => ({
      ...prev,
      trivia: {
        ...prev.trivia,
        status: "revealed",
        winnerCodes: [],
      },
    }));
  }
  if (trivia.status !== "revealed") {
    throw new Error("Nothing to undo");
  }
  const db = await getDb();
  if (trivia.roundIndex <= 1) {
    await playersCol(db).then((c) => c.deleteMany({ eventId: EVENT_ID }));
  } else {
    await playersCol(db).then((c) =>
      c.updateMany(
        { eventId: EVENT_ID, eliminatedRound: trivia.roundIndex },
        { $set: { status: "active", eliminatedRound: null } },
      ),
    );
  }
  const remainingCount = await playersCol(db).then((c) =>
    c.countDocuments({ eventId: EVENT_ID, status: "active" }),
  );
  return updateEventSuite((prev) => ({
    ...prev,
    trivia: {
      ...prev.trivia,
      status: "locked",
      survivingChoiceId: null,
      remainingCount: trivia.roundIndex <= 1 ? 0 : remainingCount,
      fieldSize: trivia.roundIndex <= 1 ? 0 : prev.trivia.fieldSize,
      winnerCodes: [],
    },
  }));
}

export async function triviaDeclareWinners(): Promise<EventSnapshot> {
  const event = await ensureEvent();
  const trivia = event.trivia ?? createDefaultTriviaState();
  if (trivia.status !== "revealed" && trivia.status !== "idle") {
    throw new Error("Reveal a surviving side first, or declare after a cut");
  }
  if (trivia.remainingCount < 1) {
    throw new Error("No remaining players to declare");
  }
  const db = await getDb();
  const players = await playersCol(db).then((c) =>
    c
      .find({ eventId: EVENT_ID, status: "active" })
      .project({ playerCode: 1 })
      .sort({ playerCode: 1 })
      .toArray(),
  );
  const winnerCodes = players.map((p) => p.playerCode);
  if (winnerCodes.length < 1) {
    throw new Error("No remaining players to declare");
  }
  return updateEventSuite((prev) => ({
    ...prev,
    trivia: {
      ...prev.trivia,
      status: "finished",
      remainingCount: winnerCodes.length,
      winnerCodes,
    },
  }));
}

export async function triviaNextQuestion(): Promise<EventSnapshot> {
  return updateEventSuite((prev) => {
    const t = prev.trivia ?? createDefaultTriviaState();
    if (t.status !== "revealed") throw new Error("Reveal a surviving side first");
    if (t.remainingCount <= 1) throw new Error("Series is over");
    return {
      ...prev,
      trivia: {
        ...t,
        status: "idle",
        roundId: "",
        roundIndex: t.roundIndex + 1,
        question: "",
        survivingChoiceId: null,
        answeredCount: 0,
        choiceACount: 0,
        choiceBCount: 0,
        winnerCodes: [],
      },
    };
  });
}

export async function triviaResetSeries(): Promise<EventSnapshot> {
  const db = await getDb();
  await votesCol(db).then((c) => c.deleteMany({ eventId: EVENT_ID }));
  await playersCol(db).then((c) => c.deleteMany({ eventId: EVENT_ID }));
  return updateEventSuite((prev) => ({
    ...prev,
    trivia: createDefaultTriviaState(),
  }));
}
