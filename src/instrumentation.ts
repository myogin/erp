import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Apply pending migrations, then sync every Chart of Accounts with the COA
// Template, before the server accepts requests. Easypanel has no pre-deploy
// hook, so a failure here stops the new container from starting.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return;

  const { getDb } = await import("@/db/client");
  const { runMigrations } = await import("@/db/migrate");
  const { syncChartTemplate } = await import("@/modules/accounting");
  await runMigrations(getDb());
  await syncChartTemplate(getDb());
}
