import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AccurateClient, compareCharts, listAccounts, readAccurateDatabases, type AccurateAccount } from ".";

// `npm run accurate:export-coa`: writes each database's GL accounts to
// exports/accurate/ (git-ignored) and prints how the charts differ.
const OUT_DIR = path.resolve("exports/accurate");

async function main() {
  const databases = readAccurateDatabases(process.env);
  if (databases.length === 0) throw new Error("No ACCURATE_API_TOKEN_<CODE> set; see .env.example");

  await mkdir(OUT_DIR, { recursive: true });
  const charts: Record<string, AccurateAccount[]> = {};
  for (const database of databases) {
    const client = new AccurateClient(database);
    const info = await client.databaseInfo();
    const accounts = await listAccounts(client);
    charts[database.code] = accounts;
    const file = path.join(OUT_DIR, `${database.code}-glaccount.json`);
    await writeFile(file, JSON.stringify({ database: info, accounts }, null, 2));
    console.log(`${database.code}: "${info.alias}" (${info.host}), ${accounts.length} accounts -> ${file}`);
  }

  if (databases.length < 2) return;
  const { identical, partial, renamed } = compareCharts(charts);
  console.log(`\nSame code and name in every database: ${identical}`);
  console.log(`Code missing from some databases: ${partial.size}`);
  for (const [no, holders] of partial) console.log(`  ${no}  only in ${holders.join(", ")}`);
  console.log(`Same code, different name: ${renamed.size}`);
  for (const [no, names] of renamed) {
    console.log(`  ${no}  ${Object.entries(names).map(([code, name]) => `${code}="${name}"`).join("  ")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
