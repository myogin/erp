import { createDb } from "./client";
import { runMigrations } from "./migrate";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, pool } = createDb(url);
  await runMigrations(db);
  await pool.end();
  console.log("Migrations applied");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
