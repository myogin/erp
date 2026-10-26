// Business dates (Accounting Periods, Payroll Run months) are computed in
// WITA, regardless of the server's own time zone (ADR-0007).
export const BUSINESS_TIME_ZONE = "Asia/Makassar";

const isoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date in WITA as `YYYY-MM-DD`. */
export function businessDate(instant: Date = new Date()): string {
  return isoDate.format(instant);
}

/** The calendar month in WITA as `YYYY-MM`. */
export function businessMonth(instant: Date = new Date()): string {
  return businessDate(instant).slice(0, 7);
}

const displayDate = new Intl.DateTimeFormat("id-ID", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** `dd/MM/yyyy` in WITA, for the UI. */
export function formatDate(instant: Date): string {
  return displayDate.format(instant);
}

const displayDateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `dd/MM/yyyy HH.mm` in WITA, for the UI. */
export function formatDateTime(instant: Date): string {
  return displayDateTime.format(instant);
}
