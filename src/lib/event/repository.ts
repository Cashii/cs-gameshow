import { ObjectId, type Collection, type Db } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { hashPin } from "@/lib/auth/session";
import { publishSnapshot } from "@/lib/event/pubsub"; // live event fan-out
import { sampleTokensByColor } from "@/lib/live-drawer/draw";
import type { LiveDrawerToken, PoolSummary } from "@/lib/live-drawer/types";
import { createEmptyPoll, type PollState } from "@/lib/poll/types";
import {
  createDefaultSuiteState,
  EVENT_ID,
  normalizeSuiteState,
  suiteToSnapshot,
  type EventSnapshot,
  type SuiteState,
} from "@/lib/suite-state";

const DEFAULT_OPERATOR_PIN = "1234";

let indexesReady = false;

export type EventDoc = SuiteState & {
  _id: string;
  revision: number;
  pinHashes: {
    operator: string;
    hostess: string;
    player: string;
  };
};

export type TokenDoc = {
  _id: ObjectId;
  eventId: string;
  number: string;
  colorId: string;
  status: "pool" | "drawn";
  drawBatchId: string | null;
  createdAt: Date;
};

export type DrawBatchDoc = {
  _id: ObjectId;
  eventId: string;
  tokenIds: ObjectId[];
  createdAt: Date;
};

export type VoteDoc = {
  _id: ObjectId;
  pollId: string;
  deviceId: string;
  playerSessionId?: string;
  choiceId: string;
  createdAt: Date;
};

async function eventsCol(db: Db): Promise<Collection<EventDoc>> {
  return db.collection<EventDoc>("events");
}

async function tokensCol(db: Db): Promise<Collection<TokenDoc>> {
  return db.collection<TokenDoc>("tokens");
}

async function drawBatchesCol(db: Db): Promise<Collection<DrawBatchDoc>> {
  return db.collection<DrawBatchDoc>("drawBatches");
}

async function votesCol(db: Db): Promise<Collection<VoteDoc>> {
  return db.collection<VoteDoc>("votes");
}

export async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;
  const db = await getDb();
  await tokensCol(db).then((c) =>
    c.createIndex({ eventId: 1, number: 1, colorId: 1 }, { unique: true }),
  );
  await tokensCol(db).then((c) =>
    c.createIndex({ eventId: 1, status: 1, colorId: 1 }),
  );
  await votesCol(db).then((c) =>
    c.createIndex({ pollId: 1, deviceId: 1 }, { unique: true }),
  );
  indexesReady = true;
}

export async function ensureEvent(): Promise<EventDoc> {
  const db = await getDb();
  await ensureIndexes();
  const col = await eventsCol(db);
  let doc = await col.findOne({ _id: EVENT_ID });
  if (!doc) {
    const defaults = createDefaultSuiteState();
    doc = {
      _id: EVENT_ID,
      revision: 1,
      ...defaults,
      pinHashes: {
        operator: hashPin(DEFAULT_OPERATOR_PIN),
        hostess: hashPin("5678"),
        player: hashPin("9999"),
      },
    };
    await col.insertOne(doc);
  }
  return doc;
}

async function loadPool(): Promise<{
  summary: PoolSummary;
  tokens: LiveDrawerToken[];
  called: LiveDrawerToken[];
}> {
  const [summary, tokens, called] = await Promise.all([
    getPoolSummary(),
    getPoolTokens(),
    getCalledTokens(),
  ]);
  return { summary, tokens, called };
}

function eventDocToSnapshot(
  doc: EventDoc,
  pool: {
    summary: PoolSummary;
    tokens: LiveDrawerToken[];
    called: LiveDrawerToken[];
  },
): EventSnapshot {
  const { _id: _id, revision, pinHashes: _pins, ...suite } = doc;
  return suiteToSnapshot(
    normalizeSuiteState(suite),
    revision,
    pool.summary,
    pool.tokens,
    pool.called,
  );
}

async function persistSuite(next: SuiteState): Promise<EventSnapshot> {
  const db = await getDb();
  const col = await eventsCol(db);
  const doc = await col.findOneAndUpdate(
    { _id: EVENT_ID },
    { $set: next, $inc: { revision: 1 } },
    { returnDocument: "after" },
  );
  if (!doc) {
    await ensureEvent();
    return persistSuite(next);
  }
  const pool = await loadPool();
  const snapshot = eventDocToSnapshot(doc, pool);
  publishSnapshot(snapshot);
  return snapshot;
}

async function bumpAndPublish(invalidatePool = false): Promise<EventSnapshot> {
  const db = await getDb();
  const col = await eventsCol(db);
  const doc = await col.findOneAndUpdate(
    { _id: EVENT_ID },
    { $inc: { revision: 1 } },
    { returnDocument: "after" },
  );
  if (!doc) {
    await ensureEvent();
    return bumpAndPublish(false);
  }
  const pool = await loadPool();
  const snapshot = eventDocToSnapshot(doc, pool);
  publishSnapshot(snapshot);
  return snapshot;
}

export async function getCalledTokens(): Promise<LiveDrawerToken[]> {
  const db = await getDb();
  const tokens = await tokensCol(db)
    .then((c) =>
      c
        .find({ eventId: EVENT_ID, status: "drawn" })
        .sort({ number: 1 })
        .toArray(),
    );
  return tokens.map(tokenDocToClient);
}

export async function getPoolTokens(): Promise<LiveDrawerToken[]> {
  const db = await getDb();
  const tokens = await tokensCol(db)
    .then((c) =>
      c
        .find({ eventId: EVENT_ID, status: "pool" })
        .sort({ createdAt: -1 })
        .toArray(),
    );
  return tokens.map(tokenDocToClient);
}

export async function getPoolSummary(): Promise<PoolSummary> {
  const db = await getDb();
  const rows = await tokensCol(db).then((c) =>
    c
      .aggregate<{ _id: string; count: number }>([
        { $match: { eventId: EVENT_ID, status: "pool" } },
        { $group: { _id: "$colorId", count: { $sum: 1 } } },
      ])
      .toArray(),
  );
  const summary: PoolSummary = {};
  for (const row of rows) summary[row._id] = row.count;
  return summary;
}

function tokenDocToClient(doc: TokenDoc): LiveDrawerToken {
  return {
    id: doc._id.toString(),
    number: doc.number,
    colorId: doc.colorId,
  };
}

export async function buildSnapshot(
  includePoolTokens = true,
): Promise<EventSnapshot> {
  const event = await ensureEvent();
  const pool = await loadPool();
  const snapshot = eventDocToSnapshot(event, pool);
  if (includePoolTokens) return snapshot;
  return { ...snapshot, poolTokens: [] };
}

export async function updateEventSuite(
  updater: (prev: SuiteState) => SuiteState,
): Promise<EventSnapshot> {
  const event = await ensureEvent();
  const { _id: _e, revision: _r, pinHashes: _p, ...current } = event;
  const next = updater(normalizeSuiteState(current));
  return persistSuite(next);
}

export async function verifyPin(
  role: "operator" | "hostess",
  pin: string,
): Promise<boolean> {
  const event = await ensureEvent();
  return event.pinHashes[role] === hashPin(pin);
}

export async function updatePins(pins: {
  operator?: string;
  hostess?: string;
}): Promise<void> {
  const db = await getDb();
  const col = await eventsCol(db);
  const set: Record<string, string> = {};
  if (pins.operator) set["pinHashes.operator"] = hashPin(pins.operator);
  if (pins.hostess) set["pinHashes.hostess"] = hashPin(pins.hostess);
  if (Object.keys(set).length === 0) return;
  await col.updateOne({ _id: EVENT_ID }, { $set: set });
  await bumpAndPublish();
}

export async function addTokens(
  entries: { number: string; colorId: string }[],
): Promise<{ added: number; skipped: number; restored: number }> {
  const db = await getDb();
  const col = await tokensCol(db);
  let added = 0;
  let skipped = 0;
  let restored = 0;
  for (const entry of entries) {
    const number = entry.number.trim();
    if (!number) continue;
    const existing = await col.findOne({
      eventId: EVENT_ID,
      number,
      colorId: entry.colorId,
    });
    if (existing?.status === "drawn") {
      await col.updateOne(
        { _id: existing._id },
        { $set: { status: "pool", drawBatchId: null } },
      );
      restored++;
      continue;
    }
    if (existing) {
      skipped++;
      continue;
    }
    try {
      await col.insertOne({
        _id: new ObjectId(),
        eventId: EVENT_ID,
        number,
        colorId: entry.colorId,
        status: "pool",
        drawBatchId: null,
        createdAt: new Date(),
      });
      added++;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        skipped++;
      } else {
        throw err;
      }
    }
  }
  if (added > 0 || restored > 0) await bumpAndPublish(true);
  return { added, skipped, restored };
}

export async function returnTokensToPool(
  tokenIds?: string[],
): Promise<EventSnapshot> {
  const db = await getDb();
  const filter: {
    eventId: string;
    status: "drawn";
    _id?: { $in: InstanceType<typeof ObjectId>[] };
  } = { eventId: EVENT_ID, status: "drawn" };
  if (tokenIds?.length) {
    filter._id = { $in: tokenIds.map((id) => new ObjectId(id)) };
  }
  await tokensCol(db).then((c) =>
    c.updateMany(filter, { $set: { status: "pool", drawBatchId: null } }),
  );
  return bumpAndPublish(true);
}

function isHexObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

export async function removeToken(
  tokenId: string,
  extra?: { number?: string; colorId?: string },
): Promise<boolean> {
  const db = await getDb();
  const col = await tokensCol(db);
  let deleted = 0;

  if (isHexObjectId(tokenId)) {
    deleted += (
      await col.deleteOne({
        _id: new ObjectId(tokenId),
        eventId: EVENT_ID,
      })
    ).deletedCount;
  }

  if (deleted === 0 && extra?.number && extra.colorId) {
    deleted += (
      await col.deleteOne({
        eventId: EVENT_ID,
        number: extra.number,
        colorId: extra.colorId,
      })
    ).deletedCount;
  }

  await updateEventSuite((prev) => ({
    ...prev,
    liveDrawer: {
      ...prev.liveDrawer,
      revealedTokens: prev.liveDrawer.revealedTokens.filter((token) => {
        if (token.id === tokenId) return false;
        if (
          extra?.number &&
          extra.colorId &&
          token.number === extra.number &&
          token.colorId === extra.colorId
        ) {
          return false;
        }
        return true;
      }),
    },
  }));
  return true;
}

export async function clearPool(): Promise<EventSnapshot> {
  const db = await getDb();
  await tokensCol(db).then((c) =>
    c.deleteMany({ eventId: EVENT_ID, status: "pool" }),
  );
  return bumpAndPublish(true);
}

export async function drawTokens(options: {
  colorCounts?: { colorId: string; count: number }[];
  tokenIds?: string[];
}): Promise<EventSnapshot> {
  const db = await getDb();
  const pool = await getPoolTokens();
  let selected: LiveDrawerToken[];

  if (options.tokenIds?.length) {
    const idSet = new Set(options.tokenIds);
    selected = pool.filter((t) => idSet.has(t.id));
    if (selected.length !== options.tokenIds.length) {
      throw new Error("One or more selected tokens are not in the pool");
    }
  } else if (options.colorCounts?.length) {
    selected = sampleTokensByColor(pool, options.colorCounts);
  } else {
    throw new Error("Specify colorCounts or tokenIds");
  }

  const batchId = new ObjectId();
  const tokenObjectIds = selected.map((t) => new ObjectId(t.id));

  await drawBatchesCol(db).then((c) =>
    c.insertOne({
      _id: batchId,
      eventId: EVENT_ID,
      tokenIds: tokenObjectIds,
      createdAt: new Date(),
    }),
  );

  await tokensCol(db).then((c) =>
    c.updateMany(
      { _id: { $in: tokenObjectIds } },
      { $set: { status: "drawn", drawBatchId: batchId.toString() } },
    ),
  );

  return updateEventSuite((prev) => ({
    ...prev,
    liveDrawer: {
      ...prev.liveDrawer,
      revealedTokens: selected,
      sequence: prev.liveDrawer.sequence + 1,
    },
  }));
}

export async function clearReveal(): Promise<EventSnapshot> {
  return updateEventSuite((prev) => ({
    ...prev,
    liveDrawer: {
      ...prev.liveDrawer,
      revealedTokens: [],
      sequence: prev.liveDrawer.sequence + 1,
    },
  }));
}

export async function undoLastBatch(): Promise<EventSnapshot> {
  const db = await getDb();
  const lastBatch = await drawBatchesCol(db).then((c) =>
    c.findOne({ eventId: EVENT_ID }, { sort: { createdAt: -1 } }),
  );
  if (!lastBatch) throw new Error("No draw batch to undo");

  await tokensCol(db).then((c) =>
    c.updateMany(
      { _id: { $in: lastBatch.tokenIds } },
      { $set: { status: "pool", drawBatchId: null } },
    ),
  );
  await drawBatchesCol(db).then((c) =>
    c.deleteOne({ _id: lastBatch._id }),
  );

  return updateEventSuite((prev) => ({
    ...prev,
    liveDrawer: {
      ...prev.liveDrawer,
      revealedTokens: [],
      sequence: prev.liveDrawer.sequence + 1,
    },
  }));
}

export async function updatePoll(
  updater: (prev: PollState) => PollState,
): Promise<EventSnapshot> {
  return updateEventSuite((prev) => ({
    ...prev,
    poll: updater(prev.poll ?? createEmptyPoll()),
  }));
}

export async function getVoteStatus(
  pollId: string,
  deviceId: string,
): Promise<{ voted: boolean; choiceId?: string }> {
  const db = await getDb();
  const vote = await votesCol(db).then((c) =>
    c.findOne({ pollId, deviceId }),
  );
  if (!vote) return { voted: false };
  return { voted: true, choiceId: vote.choiceId };
}

export async function castVote(
  pollId: string,
  deviceId: string,
  choiceId: string,
): Promise<EventSnapshot> {
  const db = await getDb();
  const event = await ensureEvent();
  const poll = event.poll ?? createEmptyPoll();
  if (poll.status !== "open" || poll.id !== pollId) {
    throw new Error("Poll is not open");
  }
  if (!poll.choices.some((c) => c.id === choiceId)) {
    throw new Error("Invalid choice");
  }
  if (!deviceId.trim()) {
    throw new Error("Device ID required");
  }

  try {
    await votesCol(db).then((c) =>
      c.insertOne({
        _id: new ObjectId(),
        pollId,
        deviceId,
        choiceId,
        createdAt: new Date(),
      }),
    );
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      throw new Error("You already voted on this poll");
    }
    throw err;
  }

  const counts = await votesCol(db).then((c) =>
    c
      .aggregate<{ _id: string; count: number }>([
        { $match: { pollId } },
        { $group: { _id: "$choiceId", count: { $sum: 1 } } },
      ])
      .toArray(),
  );
  const countMap = new Map(counts.map((r) => [r._id, r.count]));

  return updateEventSuite((prev) => ({
    ...prev,
    poll: {
      ...prev.poll,
      choices: prev.poll.choices.map((c) => ({
        ...c,
        votes: countMap.get(c.id) ?? 0,
      })),
    },
  }));
}

export async function resetPollVotes(pollId: string): Promise<void> {
  const db = await getDb();
  await votesCol(db).then((c) => c.deleteMany({ pollId }));
}

export async function importSuiteState(suite: SuiteState): Promise<EventSnapshot> {
  const db = await getDb();
  const normalized = normalizeSuiteState(suite);
  const col = await eventsCol(db);
  await col.updateOne(
    { _id: EVENT_ID },
    { $set: { ...normalized } },
  );
  return bumpAndPublish();
}
