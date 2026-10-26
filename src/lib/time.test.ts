import { describe, expect, it } from "vitest";
import { businessDate, businessMonth, formatDate } from "./time";

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
});
