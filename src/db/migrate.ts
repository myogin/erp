import { existsSync } from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Db } from "./client";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export async function runMigrations(db: Db): Promise<void> {
  // Until the first table exists, drizzle-kit has generated nothing to apply.
  if (!existsSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"))) return;
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
