import { describe, expect, it } from "vitest";
import { formatRupiah, formatRupiahInput, money, parseRupiahInput } from "./money";

// Intl separates the symbol with a non-breaking space.
const NBSP = " ";

describe("money", () => {
  it("adds without floating-point error", () => {
    expect(money("0.1").plus("0.2").toFixed(2)).toBe("0.30");
  });

  it("formats whole Rupiah without decimals", () => {
    expect(formatRupiah(money("1500000"))).toBe(`Rp${NBSP}1.500.000`);
    expect(formatRupiah(money("1500000.00"))).toBe(`Rp${NBSP}1.500.000`);
  });

  it("shows cents only when there are any, never rounding them away", () => {
    expect(formatRupiah(money("1500000.5"))).toBe(`Rp${NBSP}1.500.000,50`);
    expect(formatRupiah(money("-0.01"))).toBe(`-Rp${NBSP}0,01`);
  });

  it("formats the largest numeric(18,2) amount without losing cents", () => {
    expect(formatRupiah(money("9999999999999999.99"))).toBe(`Rp${NBSP}9.999.999.999.999.999,99`);
  });

  it("groups thousands while typing and keeps at most 2 decimals", () => {
    expect(formatRupiahInput("1500000")).toBe("1.500.000");
    expect(formatRupiahInput("1.500.000,505")).toBe("1.500.000,50");
    expect(formatRupiahInput("Rp 007a5")).toBe("75");
    expect(formatRupiahInput(",5")).toBe("0,5");
    expect(formatRupiahInput("-2500")).toBe("-2.500");
    expect(formatRupiahInput("")).toBe("");
  });

  it("parses Indonesian-format input exactly", () => {
    expect(parseRupiahInput("1.500.000,50")?.toFixed(2)).toBe("1500000.50");
    expect(parseRupiahInput("1500000")?.toFixed(2)).toBe("1500000.00");
    expect(parseRupiahInput("-2.500")?.toFixed(2)).toBe("-2500.00");
    expect(parseRupiahInput("")).toBeNull();
    expect(parseRupiahInput("abc")).toBeNull();
  });
});
