import { MongoClient, type Db } from "mongodb";

const DEFAULT_DB = "gameshow_dev";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  return uri;
}

export function getDbName(): string {
  return process.env.MONGODB_DB ?? DEFAULT_DB;
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(getUri());
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }
  const client = new MongoClient(getUri());
  return client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(getDbName());
}
