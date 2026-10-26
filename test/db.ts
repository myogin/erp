import "dotenv/config";
import { sql } from "drizzle-orm";
import { afterAll } from "vitest";
import { createDb, type Db } from "@/db/client";

/** A connection to the test database, closed after the file's tests. */
export function connectTestDb() {
  const { db, pool } = createDb(process.env.TEST_DATABASE_URL!);
  afterAll(() => pool.end());
  return db;
}

/** Empties every application table. Bypasses the audit log's append-only trigger, so tests only. */
export async function resetDb(db: Db) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`set local session_replication_role = replica`);
    const { rows } = await tx.execute<{ tablename: string }>(
      sql`select tablename from pg_tables where schemaname = 'public'`,
    );
    if (rows.length === 0) return;
    const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
    await tx.execute(sql.raw(`truncate ${tables} cascade`));
  });
}
