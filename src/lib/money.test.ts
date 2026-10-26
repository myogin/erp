import { describe, expect, it } from "vitest";
import { formatRupiah, money } from "./money";

describe("money", () => {
  it("adds without floating-point error", () => {
    expect(money("0.1").plus("0.2").toFixed(2)).toBe("0.30");
  });

  it("formats as Rupiah", () => {
    // Intl separates the symbol with a non-breaking space.
    expect(formatRupiah(money("1500000"))).toBe("Rp 1.500.000,00");
  });

  it("formats the largest numeric(18,2) amount without losing cents", () => {
    expect(formatRupiah(money("9999999999999999.99"))).toBe("Rp 9.999.999.999.999.999,99");
  });
});
