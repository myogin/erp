import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { BUSINESS_TIME_ZONE } from "@/lib/time";

export type Db = NodePgDatabase<typeof schema>;

export function createDb(connectionString: string): { db: Db; pool: Pool } {
  const pool = new Pool({
    connectionString,
    options: `-c TimeZone=${BUSINESS_TIME_ZONE}`,
  });
  return { db: drizzle(pool, { schema }), pool };
}

let shared: Db | undefined;

/** The app's shared connection, created on first use so builds don't need a database. */
export function getDb(): Db {
  if (!shared) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    shared = createDb(url).db;
  }
  return shared;
}
