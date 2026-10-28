import { createDb } from "./client";
import { syncChartTemplate } from "@/modules/accounting";
import { runMigrations } from "./migrate";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, pool } = createDb(url);
  await runMigrations(db);
  await syncChartTemplate(db);
  await pool.end();
  console.log("Migrations applied, Charts of Accounts synced");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
