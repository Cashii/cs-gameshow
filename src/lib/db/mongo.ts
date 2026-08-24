import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

const DEFAULT_DB = "gameshow_dev";

const CLIENT_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxConnecting: 2,
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
};

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
  if (!global._mongoClientPromise) {
    const client = new MongoClient(getUri(), CLIENT_OPTIONS);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(getDbName());
}
