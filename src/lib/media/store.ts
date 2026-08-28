import { Binary, ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongo";
import { EVENT_ID } from "@/lib/suite-state";
import { mediaUrl } from "@/lib/media/urls";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

export type MediaDoc = {
  _id: ObjectId;
  eventId: string;
  mimeType: string;
  data: Binary;
  createdAt: Date;
};

export type SavedMedia = {
  id: string;
  url: string;
  mimeType: string;
};

export type LoadedMedia = {
  mimeType: string;
  bytes: Buffer;
};

async function mediaCol(): Promise<Collection<MediaDoc>> {
  const db = await getDb();
  return db.collection<MediaDoc>("media");
}

export async function ensureMediaIndexes(): Promise<void> {
  const col = await mediaCol();
  await col.createIndex({ eventId: 1, createdAt: -1 });
}

export async function saveMedia(input: {
  mimeType: string;
  bytes: Buffer;
}): Promise<SavedMedia> {
  if (!ALLOWED_TYPES.has(input.mimeType)) {
    throw new Error("Unsupported image type");
  }
  if (input.bytes.length === 0) {
    throw new Error("Empty image");
  }
  if (input.bytes.length > MAX_MEDIA_BYTES) {
    throw new Error("Image is too large");
  }

  const col = await mediaCol();
  const id = new ObjectId();
  await col.insertOne({
    _id: id,
    eventId: EVENT_ID,
    mimeType: input.mimeType,
    data: new Binary(input.bytes),
    createdAt: new Date(),
  });
  return {
    id: id.toString(),
    url: mediaUrl(id.toString()),
    mimeType: input.mimeType,
  };
}

export async function loadMedia(id: string): Promise<LoadedMedia | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await mediaCol();
  const doc = await col.findOne({ _id: new ObjectId(id), eventId: EVENT_ID });
  if (!doc) return null;
  return {
    mimeType: doc.mimeType,
    bytes: Buffer.from(doc.data.buffer),
  };
}

export async function deleteMedia(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await mediaCol();
  const result = await col.deleteOne({
    _id: new ObjectId(id),
    eventId: EVENT_ID,
  });
  return result.deletedCount === 1;
}
