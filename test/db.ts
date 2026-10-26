import { afterAll } from "vitest";
import "dotenv/config";
import { createDb } from "@/db/client";

/** A connection to the test database, closed after the file's tests. */
export function useTestDb() {
  const { db, pool } = createDb(process.env.TEST_DATABASE_URL!);
  afterAll(() => pool.end());
  return db;
}
