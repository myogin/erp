import { describe, expect, it } from "vitest";
import { businessDate, businessMonth, formatDate, formatDateTime, formatIsoDate, formatMonth, nextMonth, witaWallClockAsUtc } from "./time";

describe("business time", () => {
  // 16:30 UTC on 31 Dec is already 00:30 on 1 Jan in WITA (UTC+8).
  const newYearInWita = new Date("2026-12-31T16:30:00Z");

  it("rolls the date over at WITA midnight, not UTC", () => {
    expect(businessDate(newYearInWita)).toBe("2027-01-01");
    expect(businessMonth(newYearInWita)).toBe("2027-01");
  });

  it("formats dates as dd/MM/yyyy", () => {
    expect(formatDate(newYearInWita)).toBe("01/01/2027");
  });

  it("formats date-times as dd/MM/yyyy HH.mm without a comma", () => {
    expect(formatDateTime(newYearInWita)).toBe("01/01/2027 00.30");
  });

  it("gives the WITA wall-clock time as UTC digits, for Excel", () => {
    expect(witaWallClockAsUtc(newYearInWita).toISOString()).toBe("2027-01-01T00:30:00.000Z");
  });

  it("shows a business date string as dd/MM/yyyy", () => {
    expect(formatIsoDate("2027-01-31")).toBe("31/01/2027");
  });
});

describe("months", () => {
  it("names a month in Indonesian and steps across the year end", () => {
    expect(formatMonth("2026-10")).toBe("Oktober 2026");
    expect(nextMonth("2026-12")).toBe("2027-01");
    expect(nextMonth("2026-09")).toBe("2026-10");
  });
});
