// Public interface of the accounting module. UI, API routes and future agent
// tools call these functions; they must not reach into the tables directly (ADR-0005).
export { syncChartTemplate } from "./chart";
export * from "./errors";
export {
  deleteDraft,
  getJournalEntry,
  listJournalEntries,
  postEntry,
  reverseEntry,
  saveAndPost,
  saveDraft,
  sumAmounts,
  type DraftInput,
  type JournalEntryDetail,
  type JournalLineInput,
  type JournalListQuery,
} from "./journal";
export { closePeriod, listPeriods, reopenPeriod, type PeriodRow } from "./periods";
export * from "./rules";
export {
  createSubAccount,
  listChartOfAccounts,
  renameAccount,
  setAccountActive,
  type Account,
  type ChartRow,
} from "./service";
export { TEMPLATE, type TemplateAccount } from "./template";
