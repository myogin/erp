// Public interface of the legacy-accurate module: read-only access to the
// Accurate Online Legacy System until Cutover, then removed (issue #20).
export { compareCharts, listAccounts, type AccurateAccount, type ChartComparison } from "./accounts";
export { AccurateClient, sign, type DatabaseInfo } from "./client";
export { readAccurateDatabases, type AccurateDatabase } from "./config";
