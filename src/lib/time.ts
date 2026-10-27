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

/** `dd/MM/yyyy HH.mm` in WITA, for the UI. */
export function formatDateTime(instant: Date): string {
  const [date, time] = [formatDate(instant), displayTime.format(instant)];
  return `${date} ${time}`;
}

const displayTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/**
 * The WITA wall-clock time as a Date in UTC, for formats with no time zones
 * (Excel): written out, it shows the same digits staff see on screen.
 */
export function witaWallClockAsUtc(instant: Date): Date {
  const part = (type: string) => Number(wallClock.formatToParts(instant).find((p) => p.type === type)!.value);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second")));
}

/** "2027-01-31" (a business date, no time) as "31/01/2027". */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
