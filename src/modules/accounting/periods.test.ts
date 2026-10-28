import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { businessDate, businessMonth, nextMonth } from "@/lib/time";
import { AccessDeniedError, bootstrapOwner, createCompany, createUser, grantRole, listAuditLog, type Actor, type Role } from "@/modules/access";
import { resetDb, connectTestDb } from "../../../test/db";
import {
  closePeriod,
  getJournalEntry,
  listPeriods,
  reopenPeriod,
  reverseEntry,
  saveAndPost,
  saveDraft,
} from ".";
import { chartAccount, journalEntry } from "./schema";

const db = connectTestDb();
const OWNER_EMAIL = "owner@example.com";

beforeEach(() => resetDb(db));

async function setup() {
  const owner = await bootstrapOwner(db, { name: "Owner", email: OWNER_EMAIL, password: "password-owner", allowedEmail: OWNER_EMAIL });
  const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
  const finance = await userWith(owner, "fin@example.com", "finance", cva.id);
  return { owner, cva, finance };
}

async function userWith(owner: Actor, email: string, role: Role, companyId?: string): Promise<Actor> {
  const { userId } = await createUser(db, owner, { name: email, email });
  await grantRole(db, owner, { userId, role, companyId });
  return { userId };
}

async function accountId(companyId: string, code: string): Promise<string> {
  const [row] = await db
    .select({ id: chartAccount.id })
    .from(chartAccount)
    .where(and(eq(chartAccount.companyId, companyId), eq(chartAccount.code, code)));
  return row.id;
}

async function sale(companyId: string, date: string, amount = "1500000.00") {
  return {
    companyId,
    date,
    description: "Penjualan tunai",
    lines: [
      { accountId: await accountId(companyId, "110101"), debit: amount, credit: "", description: "Kas masuk" },
      { accountId: await accountId(companyId, "410101"), debit: "", credit: amount },
    ],
  };
}

describe("Reversal", () => {
  it("posts a mirror of the original, linked both ways, and is audit-logged", async () => {
    const { owner, cva, finance } = await setup();
    const original = await saveAndPost(db, finance, await sale(cva.id, "2026-02-10"));

    const reversal = await reverseEntry(db, finance, { entryId: original.id, date: "2026-02-20", reason: "Salah akun" });
    expect(reversal.documentNumber).toBe("JV/CVA/2026/00002");

    const entry = await getJournalEntry(db, finance, reversal.id);
    expect(entry).toMatchObject({
      status: "posted",
      date: "2026-02-20",
      description: "Jurnal balik JV/CVA/2026/00001: Salah akun",
      reverses: { id: original.id, documentNumber: "JV/CVA/2026/00001" },
      reversedBy: null,
    });
    expect(entry.lines.map((l) => [l.accountCode, l.debit, l.credit, l.description])).toEqual([
      ["110101", "0.00", "1500000.00", "Kas masuk"],
      ["410101", "1500000.00", "0.00", null],
    ]);
    expect((await getJournalEntry(db, finance, original.id)).reversedBy).toEqual({ id: reversal.id, documentNumber: "JV/CVA/2026/00002" });

    const { rows } = await listAuditLog(db, owner);
    expect(rows.map((r) => r.action)).toContain("journal.reverse");
  });

  it("happens once per entry and never to a Reversal", async () => {
    const { cva, finance } = await setup();
    const original = await saveAndPost(db, finance, await sale(cva.id, "2026-02-10"));
    const reversal = await reverseEntry(db, finance, { entryId: original.id, date: "2026-02-10", reason: "Salah" });

    await expect(reverseEntry(db, finance, { entryId: original.id, date: "2026-02-11", reason: "Lagi" })).rejects.toThrow(/sudah dibalik/);
    await expect(reverseEntry(db, finance, { entryId: reversal.id, date: "2026-02-11", reason: "Balik lagi" })).rejects.toThrow(
      /jurnal balik/,
    );
  });

  it("can't go before the original, into the future, onto a Draft, or without a reason", async () => {
    const { cva, finance } = await setup();
    const original = await saveAndPost(db, finance, await sale(cva.id, "2026-02-10"));
    const draft = await saveDraft(db, finance, await sale(cva.id, "2026-02-10"));
    const tomorrow = businessDate(new Date(Date.now() + 86_400_000));

    await expect(reverseEntry(db, finance, { entryId: original.id, date: "2026-02-09", reason: "x" })).rejects.toThrow(/sebelum/);
    await expect(reverseEntry(db, finance, { entryId: original.id, date: tomorrow, reason: "x" })).rejects.toThrow(/masa depan/);
    await expect(reverseEntry(db, finance, { entryId: draft.id, date: "2026-02-10", reason: "x" })).rejects.toThrow(/diposting/);
    await expect(reverseEntry(db, finance, { entryId: original.id, date: "2026-02-10", reason: " " })).rejects.toThrow(/Alasan/);
  });

  it("is for the Company's Finance and the Owner", async () => {
    const { owner, cva, finance } = await setup();
    const management = await userWith(owner, "mgmt@example.com", "management", cva.id);
    const original = await saveAndPost(db, finance, await sale(cva.id, "2026-02-10"));
    await expect(reverseEntry(db, management, { entryId: original.id, date: "2026-02-10", reason: "x" })).rejects.toThrow(AccessDeniedError);
    await reverseEntry(db, owner, { entryId: original.id, date: "2026-02-10", reason: "x" });
  });
});

describe("Period Close", () => {
  it("closes months in order from the first posted month, and blocks Posting into them", async () => {
    const { owner, cva, finance } = await setup();
    expect((await listPeriods(db, finance, cva.id)).nextToClose).toBeNull();

    const january = await saveAndPost(db, finance, await sale(cva.id, "2026-01-15"));
    await saveAndPost(db, finance, await sale(cva.id, "2026-03-05"));
    let periods = await listPeriods(db, finance, cva.id);
    expect(periods.nextToClose).toBe("2026-01");
    expect(periods.months[0]).toMatchObject({ month: "2026-01", closed: false, draftCount: 0 });

    await expect(closePeriod(db, finance, { companyId: cva.id, month: "2026-02" })).rejects.toThrow(/berurutan/);
    await closePeriod(db, finance, { companyId: cva.id, month: "2026-01" });
    await closePeriod(db, finance, { companyId: cva.id, month: "2026-02" });

    periods = await listPeriods(db, finance, cva.id);
    expect(periods).toMatchObject({ nextToClose: "2026-03", lastClosed: "2026-02" });
    expect(periods.months[0]).toMatchObject({ month: "2026-01", closed: true, closedByName: "fin@example.com" });

    await expect(saveAndPost(db, finance, await sale(cva.id, "2026-02-27"))).rejects.toThrow(/Februari 2026 sudah ditutup/);
    // A Reversal goes into an open month instead.
    await expect(reverseEntry(db, finance, { entryId: january.id, date: "2026-01-31", reason: "x" })).rejects.toThrow(/sudah ditutup/);
    await reverseEntry(db, finance, { entryId: january.id, date: "2026-03-01", reason: "x" });

    const { rows } = await listAuditLog(db, owner);
    expect(rows.map((r) => r.action)).toContain("period.close");
  });

  it("refuses Posting into a closed month in the database itself", async () => {
    const { cva, finance } = await setup();
    await saveAndPost(db, finance, await sale(cva.id, "2026-01-15"));
    const draft = await saveDraft(db, finance, await sale(cva.id, "2026-03-15"));
    await closePeriod(db, finance, { companyId: cva.id, month: "2026-01" });
    await db.update(journalEntry).set({ date: "2026-01-20" }).where(eq(journalEntry.id, draft.id));

    await expect(
      db
        .update(journalEntry)
        .set({ status: "posted", year: 2026, sequence: 99, documentNumber: "JV/CVA/2026/00099", postedAt: new Date() })
        .where(eq(journalEntry.id, draft.id)),
    ).rejects.toMatchObject({ cause: { message: expect.stringMatching(/closed/) } });
  });

  it("needs the month to have ended and to hold no Drafts", async () => {
    const { cva, finance } = await setup();
    await saveAndPost(db, finance, await sale(cva.id, "2026-01-15"));
    const draft = await saveDraft(db, finance, await sale(cva.id, "2026-01-20"));
    expect((await listPeriods(db, finance, cva.id)).months[0].draftCount).toBe(1);
    await expect(closePeriod(db, finance, { companyId: cva.id, month: "2026-01" })).rejects.toThrow(/draf/);

    await db.delete(journalEntry).where(eq(journalEntry.id, draft.id));
    await closePeriod(db, finance, { companyId: cva.id, month: "2026-01" });

    const current = businessMonth();
    await saveAndPost(db, finance, await sale(cva.id, businessDate()));
    for (let m = "2026-02"; m < current; m = nextMonth(m)) {
      await closePeriod(db, finance, { companyId: cva.id, month: m });
    }
    await expect(closePeriod(db, finance, { companyId: cva.id, month: current })).rejects.toThrow(/belum berakhir/);
  });

  it("can be reopened by the Owner only, latest month first, with a reason", async () => {
    const { owner, cva, finance } = await setup();
    await saveAndPost(db, finance, await sale(cva.id, "2026-01-15"));
    await closePeriod(db, finance, { companyId: cva.id, month: "2026-01" });
    await closePeriod(db, finance, { companyId: cva.id, month: "2026-02" });

    await expect(reopenPeriod(db, finance, { companyId: cva.id, month: "2026-02", reason: "Invoice telat" })).rejects.toThrow(AccessDeniedError);
    await expect(reopenPeriod(db, owner, { companyId: cva.id, month: "2026-01", reason: "Invoice telat" })).rejects.toThrow(/terakhir/);
    await expect(reopenPeriod(db, owner, { companyId: cva.id, month: "2026-02", reason: "" })).rejects.toThrow(/Alasan/);
    await reopenPeriod(db, owner, { companyId: cva.id, month: "2026-02", reason: "Invoice telat" });

    expect((await listPeriods(db, finance, cva.id)).lastClosed).toBe("2026-01");
    await saveAndPost(db, finance, await sale(cva.id, "2026-02-27"));
    const { rows } = await listAuditLog(db, owner);
    expect(rows[1]).toMatchObject({ action: "period.reopen", details: { period: "2026-02", reason: "Invoice telat" } });
  });

  it("is for the Company's Finance and the Owner; Management can look", async () => {
    const { owner, cva, finance } = await setup();
    const management = await userWith(owner, "mgmt@example.com", "management", cva.id);
    const admin = await userWith(owner, "admin@example.com", "admin");
    await saveAndPost(db, finance, await sale(cva.id, "2026-01-15"));

    expect((await listPeriods(db, management, cva.id)).nextToClose).toBe("2026-01");
    await expect(listPeriods(db, admin, cva.id)).rejects.toThrow(AccessDeniedError);
    await expect(closePeriod(db, management, { companyId: cva.id, month: "2026-01" })).rejects.toThrow(AccessDeniedError);
  });
});
