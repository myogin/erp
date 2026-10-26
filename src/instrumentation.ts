import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Apply pending migrations before the server accepts requests. Easypanel has
// no pre-deploy hook, so a failed migration stops the new container from starting.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return;

  const { getDb } = await import("@/db/client");
  const { runMigrations } = await import("@/db/migrate");
  await runMigrations(getDb());
}
