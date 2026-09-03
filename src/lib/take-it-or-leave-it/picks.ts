import { ObjectId, type Collection, type Db } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { EVENT_ID } from "@/lib/suite-state";
import { getDeviceCode } from "@/lib/player/device-id";
import {
  createDefaultTakeItState,
  emptyTakeItPickCounts,
  type TakeItCard,
  type TakeItGameState,
} from "@/lib/take-it-or-leave-it/types";
import {
  ensureEvent,
  updateEventSuite,
} from "@/lib/event/repository";
import type { EventSnapshot } from "@/lib/suite-state";

type TakeItPickDoc = {
  _id: ObjectId;
  eventId: string;
  roundId: string;
  deviceId: string;
  caseId: number;
  playerCode: string;
  createdAt: Date;
};

export type TakeItMe = {
  caseId: number | null;
  /** Set once the player's case has been opened. */
  card: TakeItCard | null;
  result: "none" | "waiting" | "continue" | "eliminated";
};

async function picksCol(db: Db): Promise<Collection<TakeItPickDoc>> {
  return db.collection<TakeItPickDoc>("takeItPicks");
}

export async function ensureTakeItIndexes(): Promise<void> {
  const db = await getDb();
  const col = await picksCol(db);
  // Older builds locked one phone per case; many guests may share a case now.
  try {
    await col.dropIndex("eventId_1_roundId_1_caseId_1");
  } catch {
    /* index may not exist */
  }
  await col.createIndex(
    { eventId: 1, roundId: 1, deviceId: 1 },
    { unique: true },
  );
  await col.createIndex({ eventId: 1, roundId: 1 });
  await col.createIndex({ eventId: 1, roundId: 1, caseId: 1 });
}

export async function refreshTakeItPickCounts(
  takeIt: TakeItGameState,
): Promise<TakeItGameState> {
  const pickCounts = emptyTakeItPickCounts();
  if (!takeIt.roundId) {
    return { ...takeIt, pickCounts };
  }
  const db = await getDb();
  const counts = await picksCol(db).then((c) =>
    c
      .aggregate<{ _id: number; count: number }>([
        { $match: { eventId: EVENT_ID, roundId: takeIt.roundId } },
        { $group: { _id: "$caseId", count: { $sum: 1 } } },
      ])
      .toArray(),
  );
  for (const row of counts) {
    pickCounts[String(row._id)] = row.count;
  }
  return { ...takeIt, pickCounts };
}

export async function getTakeItMe(
  deviceId: string,
): Promise<TakeItMe> {
  const trimmed = deviceId.trim();
  if (!trimmed) {
    return { caseId: null, card: null, result: "none" };
  }
  const event = await ensureEvent();
  const takeIt = event.takeIt ?? createDefaultTakeItState();
  if (!takeIt.roundId || takeIt.phase === "setup") {
    return { caseId: null, card: null, result: "none" };
  }

  const db = await getDb();
  const pick = await picksCol(db).then((c) =>
    c.findOne({
      eventId: EVENT_ID,
      roundId: takeIt.roundId!,
      deviceId: trimmed,
    }),
  );
  if (!pick) {
    return { caseId: null, card: null, result: "none" };
  }

  const chosen = takeIt.cases.find((c) => c.id === pick.caseId);
  if (!chosen) {
    return { caseId: pick.caseId, card: null, result: "waiting" };
  }
  if (!chosen.opened) {
    return { caseId: pick.caseId, card: null, result: "waiting" };
  }
  return {
    caseId: pick.caseId,
    card: chosen.card,
    result: chosen.card === "green" ? "continue" : "eliminated",
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

export async function castTakeItPick(
  roundId: string,
  caseId: number,
  deviceId: string,
): Promise<EventSnapshot> {
  const trimmed = deviceId.trim();
  if (!trimmed) throw new Error("deviceId required");
  if (!roundId.trim()) throw new Error("roundId required");
  if (!Number.isFinite(caseId) || caseId < 1) throw new Error("Invalid case");

  const event = await ensureEvent();
  const takeIt = event.takeIt ?? createDefaultTakeItState();
  if (takeIt.phase !== "pick") throw new Error("Picking is closed");
  if (takeIt.roundId !== roundId) throw new Error("This round is no longer open");
  const target = takeIt.cases.find((c) => c.id === caseId);
  if (!target || target.opened) throw new Error("That case is not available");

  const db = await getDb();
  try {
    await picksCol(db).then((c) =>
      c.insertOne({
        _id: new ObjectId(),
        eventId: EVENT_ID,
        roundId,
        deviceId: trimmed,
        caseId,
        playerCode: getDeviceCode(trimmed),
        createdAt: new Date(),
      }),
    );
  } catch (err) {
    if (isDupKey(err)) throw new Error("You already picked a case");
    throw err;
  }

  return updateEventSuite((prev) => prev);
}

export async function clearTakeItPicks(roundId: string | null): Promise<void> {
  if (!roundId) return;
  const db = await getDb();
  await picksCol(db).then((c) =>
    c.deleteMany({ eventId: EVENT_ID, roundId }),
  );
}

export async function startTakeItRound(): Promise<EventSnapshot> {
  const event = await ensureEvent();
  const takeIt = event.takeIt ?? createDefaultTakeItState();
  if (!Array.isArray(takeIt.cards) || takeIt.cards.length < 3) {
    throw new Error("Add at least 3 cases before starting");
  }
  await clearTakeItPicks(takeIt.roundId);
  const { cardsToCases } = await import("@/lib/take-it-or-leave-it/logic");
  const roundId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `takeit-${Date.now()}`;
  return updateEventSuite((prev) => {
    const current = prev.takeIt ?? createDefaultTakeItState();
    return {
      ...prev,
      takeIt: {
        ...current,
        phase: "pick",
        cases: cardsToCases(current.cards),
        roundId,
        lastOpenedCaseId: null,
        pickCounts: {},
      },
    };
  });
}

export async function resetTakeItRound(): Promise<EventSnapshot> {
  const event = await ensureEvent();
  const takeIt = event.takeIt ?? createDefaultTakeItState();
  await clearTakeItPicks(takeIt.roundId);
  return updateEventSuite((prev) => {
    const current = prev.takeIt ?? createDefaultTakeItState();
    return {
      ...prev,
      takeIt: {
        ...createDefaultTakeItState(),
        cards: [...current.cards],
      },
    };
  });
}
