import { ObjectId, type Collection, type Db } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { EVENT_ID } from "@/lib/suite-state";
import { getDeviceCode } from "@/lib/player/device-id";
import {
  createDefaultDerbyState,
  emptyDerbyVoteTallies,
  isDerbyRacerId,
  type DerbyGameState,
  type DerbyRacerId,
} from "@/lib/derby/types";
import {
  ensureEvent,
  updateEventSuite,
} from "@/lib/event/repository";
import type { EventSnapshot } from "@/lib/suite-state";

type DerbyVoteDoc = {
  _id: ObjectId;
  eventId: string;
  raceId: string;
  deviceId: string;
  racerId: DerbyRacerId;
  playerCode: string;
  createdAt: Date;
};

async function derbyVotesCol(db: Db): Promise<Collection<DerbyVoteDoc>> {
  return db.collection<DerbyVoteDoc>("derbyVotes");
}

export async function ensureDerbyIndexes(): Promise<void> {
  const db = await getDb();
  await derbyVotesCol(db).then((c) =>
    c.createIndex({ eventId: 1, raceId: 1, deviceId: 1 }, { unique: true }),
  );
  await derbyVotesCol(db).then((c) =>
    c.createIndex({ eventId: 1, raceId: 1 }),
  );
}

export async function refreshDerbyVoteTallies(
  derby: DerbyGameState,
): Promise<DerbyGameState> {
  const tallies = emptyDerbyVoteTallies();
  if (!derby.raceId) {
    return { ...derby, voteTallies: tallies };
  }
  const db = await getDb();
  const counts = await derbyVotesCol(db).then((c) =>
    c
      .aggregate<{ _id: DerbyRacerId; count: number }>([
        { $match: { eventId: EVENT_ID, raceId: derby.raceId } },
        { $group: { _id: "$racerId", count: { $sum: 1 } } },
      ])
      .toArray(),
  );
  for (const row of counts) {
    if (isDerbyRacerId(row._id)) tallies[row._id] = row.count;
  }
  return { ...derby, voteTallies: tallies };
}

export async function getDerbyVoteStatus(
  raceId: string,
  deviceId: string,
): Promise<{ voted: boolean; racerId?: DerbyRacerId }> {
  if (!raceId || !deviceId.trim()) return { voted: false };
  const db = await getDb();
  const vote = await derbyVotesCol(db).then((c) =>
    c.findOne({ eventId: EVENT_ID, raceId, deviceId: deviceId.trim() }),
  );
  if (!vote) return { voted: false };
  return { voted: true, racerId: vote.racerId };
}

function isDupKey(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

export async function castDerbyVote(
  raceId: string,
  racerId: string,
  deviceId: string,
): Promise<EventSnapshot> {
  if (!isDerbyRacerId(racerId)) throw new Error("Invalid racer");
  const trimmed = deviceId.trim();
  if (!trimmed) throw new Error("deviceId required");
  if (!raceId.trim()) throw new Error("raceId required");

  const event = await ensureEvent();
  const derby = event.derby ?? createDefaultDerbyState();
  if (derby.phase !== "idle") throw new Error("Voting is closed");
  if (derby.raceId !== raceId) throw new Error("This race is no longer open");

  const db = await getDb();
  try {
    await derbyVotesCol(db).then((c) =>
      c.insertOne({
        _id: new ObjectId(),
        eventId: EVENT_ID,
        raceId,
        deviceId: trimmed,
        racerId,
        playerCode: getDeviceCode(trimmed),
        createdAt: new Date(),
      }),
    );
  } catch (err) {
    if (isDupKey(err)) throw new Error("You already picked a racer");
    throw err;
  }

  return updateEventSuite((prev) => prev);
}

export async function clearDerbyVotes(raceId: string | null): Promise<void> {
  if (!raceId) return;
  const db = await getDb();
  await derbyVotesCol(db).then((c) =>
    c.deleteMany({ eventId: EVENT_ID, raceId }),
  );
}
