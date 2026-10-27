import { describe, expect, it } from "vitest";
import { actionsMatchingLabel, formatAuditDetails } from "./audit-labels";

describe("audit labels", () => {
  it("finds actions by the label staff see", () => {
    expect(actionsMatchingLabel("PERUSAHAAN dibuat")).toEqual(["company.create"]);
    expect(actionsMatchingLabel("  ")).toEqual([]);
  });

  it("shows details as readable text with Role labels", () => {
    expect(formatAuditDetails({ code: "CVA", name: "CV Alpha" })).toBe("Kode: CVA · Nama: CV Alpha");
    expect(formatAuditDetails({ role: "finance" })).toBe("Peran: Keuangan");
    expect(formatAuditDetails(null)).toBe("");
  });
});
