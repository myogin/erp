import { describe, expect, it } from "vitest";
import { compareCharts, readAccurateDatabases, sign, type AccurateAccount } from ".";

describe("readAccurateDatabases", () => {
  it("reads one database per ACCURATE_API_TOKEN_<CODE>, sharing the signature secret", () => {
    const databases = readAccurateDatabases({
      ACCURATE_SIGNATURE_SECRET: "shared",
      ACCURATE_API_TOKEN_CVB: "token-b",
      ACCURATE_API_TOKEN_CVA: " token-a ",
      ACCURATE_API_TOKEN_CVC: "",
      UNRELATED: "x",
    });
    expect(databases).toEqual([
      { code: "CVA", apiToken: "token-a", signatureSecret: "shared" },
      { code: "CVB", apiToken: "token-b", signatureSecret: "shared" },
    ]);
  });

  it("prefers a per-database signature secret", () => {
    const [database] = readAccurateDatabases({
      ACCURATE_SIGNATURE_SECRET: "shared",
      ACCURATE_SIGNATURE_SECRET_CVA: "own",
      ACCURATE_API_TOKEN_CVA: "token-a",
    });
    expect(database.signatureSecret).toBe("own");
  });

  it("rejects a token without any signature secret, or with a bad code", () => {
    expect(() => readAccurateDatabases({ ACCURATE_API_TOKEN_CVA: "t" })).toThrow(/signature secret/);
    expect(() => readAccurateDatabases({ ACCURATE_SIGNATURE_SECRET: "s", ACCURATE_API_TOKEN_cva: "t" })).toThrow(
      /Company code/,
    );
  });
});

describe("sign", () => {
  it("is base64 HMAC-SHA256 of the timestamp", () => {
    // echo -n "2026-10-27T03:00:00.000Z" | openssl dgst -sha256 -hmac secret -binary | base64
    expect(sign("2026-10-27T03:00:00.000Z", "secret")).toBe("ZeZZPGeyWaWkmBHL5mlyqMyK0ga+RKmOwMTOdKk93NI=");
  });
});

describe("compareCharts", () => {
  const account = (no: string, name: string): AccurateAccount => ({ id: 0, no, name, accountType: "CASH_BANK" });

  it("splits account codes into identical, partial and renamed", () => {
    const result = compareCharts({
      CVA: [account("1101", "Kas"), account("1102", "Bank BCA"), account("1103", "Bank")],
      CVB: [account("1101", "kas "), account("1103", "Bank Operasional")],
    });
    expect(result.identical).toBe(1);
    expect(result.partial).toEqual(new Map([["1102", ["CVA"]]]));
    expect(result.renamed).toEqual(new Map([["1103", { CVA: "Bank", CVB: "Bank Operasional" }]]));
  });
});
