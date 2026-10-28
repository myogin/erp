import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { businessDate } from "@/lib/time";
import { AccessDeniedError, bootstrapOwner, createCompany, createUser, grantRole, listAuditLog, type Actor, type Role } from "@/modules/access";
import { resetDb, connectTestDb } from "../../../test/db";
import {
  AccountingRuleError,
  createSubAccount,
  deleteDraft,
  getJournalEntry,
  listJournalEntries,
  postEntry,
  saveAndPost,
  saveDraft,
  setAccountActive,
  syncChartTemplate,
  TEMPLATE,
} from ".";
import { chartAccount, journalEntry, journalLine } from "./schema";

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

/** Petty cash 110101 against sales 410101, both template detail Accounts. */
async function cashSale(companyId: string, amount = "1500000.00", date = "2026-03-10") {
  return {
    companyId,
    date,
    description: "Penjualan tunai",
    lines: [
      { accountId: await accountId(companyId, "110101"), debit: amount, credit: "" },
      { accountId: await accountId(companyId, "410101"), debit: "", credit: amount },
    ],
  };
}

describe("Posting", () => {
  it("gives a Draft its Document Number and records it in the Audit Log", async () => {
    const { owner, cva, finance } = await setup();
    const { id } = await saveDraft(db, finance, await cashSale(cva.id));
    expect((await getJournalEntry(db, finance, id)).status).toBe("draft");

    const { documentNumber } = await postEntry(db, finance, id);
    expect(documentNumber).toBe("JV/CVA/2026/00001");
    const entry = await getJournalEntry(db, finance, id);
    expect(entry).toMatchObject({ status: "posted", documentNumber, postedBy: finance.userId });
    expect(entry.lines.map((l) => [l.accountCode, l.debit, l.credit])).toEqual([
      ["110101", "1500000.00", "0.00"],
      ["410101", "0.00", "1500000.00"],
    ]);

    const { rows } = await listAuditLog(db, owner);
    expect(rows[0]).toMatchObject({ action: "journal.post", companyCode: "CVA", targetId: id, details: { number: documentNumber } });
  });

  it("numbers by the year of the entry's date, each year from 1", async () => {
    const { cva, finance } = await setup();
    const post = async (date: string) => postEntry(db, finance, (await saveDraft(db, finance, await cashSale(cva.id, "100.00", date))).id);
    expect((await post("2026-02-01")).documentNumber).toBe("JV/CVA/2026/00001");
    expect((await post("2025-12-31")).documentNumber).toBe("JV/CVA/2025/00001");
    expect((await post("2026-01-05")).documentNumber).toBe("JV/CVA/2026/00002");
  });

  it("stays gap-free when entries are posted at the same time and when a Posting fails", async () => {
    const { cva, finance } = await setup();
    const drafts = await Promise.all(Array.from({ length: 8 }, async () => (await saveDraft(db, finance, await cashSale(cva.id))).id));
    const unbalanced = await saveDraft(db, finance, {
      ...(await cashSale(cva.id)),
      lines: [(await cashSale(cva.id)).lines[0], { ...(await cashSale(cva.id)).lines[1], credit: "1.00" }],
    });

    const results = await Promise.allSettled([...drafts, unbalanced.id].map((id) => postEntry(db, finance, id)));
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const numbers = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.documentNumber] : [])).sort();
    expect(numbers).toEqual(Array.from({ length: 8 }, (_, i) => `JV/CVA/2026/0000${i + 1}`));
  });

  it("refuses an unbalanced or one-line entry, though a Draft may be unbalanced", async () => {
    const { cva, finance } = await setup();
    const sale = await cashSale(cva.id);
    const unbalanced = await saveDraft(db, finance, { ...sale, lines: [sale.lines[0], { ...sale.lines[1], credit: "1400000.00" }] });
    await expect(postEntry(db, finance, unbalanced.id)).rejects.toThrow(/seimbang/);
    const oneLine = await saveDraft(db, finance, { ...sale, lines: [sale.lines[0]] });
    await expect(postEntry(db, finance, oneLine.id)).rejects.toThrow(/2 baris/);
  });

  it("refuses an unbalanced entry in the database itself", async () => {
    const { cva, finance } = await setup();
    const sale = await cashSale(cva.id);
    const { id } = await saveDraft(db, finance, { ...sale, lines: [sale.lines[0], { ...sale.lines[1], credit: "1.00" }] });
    await expect(
      db
        .update(journalEntry)
        .set({ status: "posted", year: 2026, sequence: 1, documentNumber: "JV/CVA/2026/00001", postedAt: new Date() })
        .where(eq(journalEntry.id, id)),
    ).rejects.toMatchObject({ cause: { message: expect.stringMatching(/does not balance/) } });
  });

  it("can save and post in one step, leaving nothing behind when Posting fails", async () => {
    const { cva, finance } = await setup();
    const { id, documentNumber } = await saveAndPost(db, finance, await cashSale(cva.id));
    expect(documentNumber).toBe("JV/CVA/2026/00001");
    expect(await getJournalEntry(db, finance, id)).toMatchObject({ status: "posted", createdByName: "fin@example.com", postedByName: "fin@example.com" });

    const sale = await cashSale(cva.id);
    await expect(saveAndPost(db, finance, { ...sale, lines: [sale.lines[0], { ...sale.lines[1], credit: "1.00" }] })).rejects.toThrow(/seimbang/);
    expect((await listJournalEntries(db, finance, cva.id)).total).toBe(1);
  });

  it("re-checks the Accounts at Posting", async () => {
    const { cva, finance } = await setup();
    await createSubAccount(db, finance, { companyId: cva.id, parentCode: "1101", code: "110150", name: "Bank BCA" });
    const bank = await accountId(cva.id, "110150");
    const sale = await cashSale(cva.id);
    const { id } = await saveDraft(db, finance, { ...sale, lines: [{ ...sale.lines[0], accountId: bank }, sale.lines[1]] });
    await setAccountActive(db, finance, { accountId: bank, active: false });
    await expect(postEntry(db, finance, id)).rejects.toThrow(/nonaktif/);
  });
});

describe("posted entries", () => {
  it("cannot be changed or deleted through the app", async () => {
    const { cva, finance } = await setup();
    const { id } = await saveDraft(db, finance, await cashSale(cva.id));
    await postEntry(db, finance, id);
    await expect(saveDraft(db, finance, { ...(await cashSale(cva.id)), entryId: id })).rejects.toThrow(AccountingRuleError);
    await expect(deleteDraft(db, finance, id)).rejects.toThrow(AccountingRuleError);
    await expect(postEntry(db, finance, id)).rejects.toThrow(AccountingRuleError);
  });

  it("cannot be changed or deleted in the database either", async () => {
    const { cva, finance } = await setup();
    const { id } = await saveDraft(db, finance, await cashSale(cva.id));
    await postEntry(db, finance, id);
    const refused = { cause: { message: expect.stringMatching(/is posted/) } };
    await expect(db.update(journalEntry).set({ description: "x" }).where(eq(journalEntry.id, id))).rejects.toMatchObject(refused);
    await expect(db.delete(journalEntry).where(eq(journalEntry.id, id))).rejects.toMatchObject(refused);
    await expect(db.update(journalLine).set({ debit: "1.00" }).where(eq(journalLine.entryId, id))).rejects.toMatchObject(refused);
    await expect(db.delete(journalLine).where(eq(journalLine.entryId, id))).rejects.toMatchObject(refused);
    const [line] = await db.select().from(journalLine).where(eq(journalLine.entryId, id));
    await expect(db.insert(journalLine).values({ ...line, id: undefined, lineNo: 3 })).rejects.toMatchObject(refused);
  });
});

describe("Drafts", () => {
  it("can be changed and deleted; deletion is in the Audit Log", async () => {
    const { owner, cva, finance } = await setup();
    const { id } = await saveDraft(db, finance, await cashSale(cva.id));
    await saveDraft(db, finance, { ...(await cashSale(cva.id, "2000000.00")), entryId: id, description: "Diubah" });
    const entry = await getJournalEntry(db, finance, id);
    expect(entry).toMatchObject({ description: "Diubah", documentNumber: null });
    expect(entry.lines.map((l) => l.debit)).toEqual(["2000000.00", "0.00"]);

    await deleteDraft(db, finance, id);
    expect(await db.select().from(journalEntry).where(eq(journalEntry.id, id))).toHaveLength(0);
    const { rows } = await listAuditLog(db, owner);
    expect(rows[0]).toMatchObject({ action: "journal.delete_draft", targetId: id });
  });

  it("rejects bad lines and future dates", async () => {
    const { owner, cva, finance } = await setup();
    const cvb = await createCompany(db, owner, { code: "CVB", name: "CV B" });
    const sale = await cashSale(cva.id);
    const [debit, credit] = sale.lines;
    const withLine = (line: typeof debit) => saveDraft(db, finance, { ...sale, lines: [line, credit] });

    await expect(withLine({ ...debit, credit: "5.00" })).rejects.toThrow(/debit atau kredit/);
    await expect(withLine({ ...debit, debit: "" })).rejects.toThrow(/debit atau kredit/);
    await expect(withLine({ ...debit, debit: "-5.00" })).rejects.toThrow();
    await expect(withLine({ ...debit, debit: "1.005" })).rejects.toThrow(/2 angka/);
    await expect(withLine({ ...debit, accountId: await accountId(cva.id, "1101") })).rejects.toThrow(/induk/);
    await expect(withLine({ ...debit, accountId: await accountId(cvb.id, "110101") })).rejects.toThrow(/tidak ditemukan/);

    const tomorrow = new Date(Date.now() + 86_400_000);
    await expect(saveDraft(db, finance, { ...sale, date: businessDate(tomorrow) })).rejects.toThrow(/masa depan/);
  });
});

describe("access", () => {
  it("lets the Company's Finance and the Owner write; Management reads posted entries only", async () => {
    const { owner, cva, finance } = await setup();
    const cvb = await createCompany(db, owner, { code: "CVB", name: "CV B" });
    const financeB = await userWith(owner, "finb@example.com", "finance", cvb.id);
    const management = await userWith(owner, "mgmt@example.com", "management", cva.id);
    const admin = await userWith(owner, "admin@example.com", "admin");
    const hr = await userWith(owner, "hr@example.com", "hr", cva.id);

    const draft = await saveDraft(db, finance, await cashSale(cva.id));
    const posted = await saveDraft(db, owner, await cashSale(cva.id));
    await postEntry(db, owner, posted.id);

    for (const actor of [financeB, management, admin, hr]) {
      await expect(saveDraft(db, actor, await cashSale(cva.id))).rejects.toThrow(AccessDeniedError);
      await expect(postEntry(db, actor, draft.id)).rejects.toThrow(AccessDeniedError);
      await expect(deleteDraft(db, actor, draft.id)).rejects.toThrow(AccessDeniedError);
    }
    for (const actor of [financeB, admin, hr]) {
      await expect(listJournalEntries(db, actor, cva.id)).rejects.toThrow(AccessDeniedError);
    }

    expect((await listJournalEntries(db, finance, cva.id)).rows.map((r) => r.status).sort()).toEqual(["draft", "posted"]);
    expect((await listJournalEntries(db, management, cva.id)).rows.map((r) => r.id)).toEqual([posted.id]);
    await expect(getJournalEntry(db, management, draft.id)).rejects.toThrow(AccessDeniedError);
  });

  it("lists with search, status filter and paging", async () => {
    const { cva, finance } = await setup();
    for (const description of ["Sewa Januari", "Sewa Februari", "Gaji Maret"]) {
      await saveDraft(db, finance, { ...(await cashSale(cva.id)), description });
    }
    const first = (await listJournalEntries(db, finance, cva.id, { search: "sewa" })).rows;
    await postEntry(db, finance, first[0].id);

    expect((await listJournalEntries(db, finance, cva.id, { search: "sewa" })).total).toBe(2);
    expect((await listJournalEntries(db, finance, cva.id, { status: "posted" })).rows.map((r) => r.documentNumber)).toEqual(["JV/CVA/2026/00001"]);
    expect((await listJournalEntries(db, finance, cva.id, { search: "00001" })).total).toBe(1);
    const page = await listJournalEntries(db, finance, cva.id, { page: 2, pageSize: 2 });
    expect(page).toMatchObject({ total: 3, page: 2 });
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].total).toBe("1500000.00");
  });
});

describe("Accounts with Postings", () => {
  it("take no Sub-accounts, can't be deactivated with a balance, and survive template removal", async () => {
    const { cva, finance } = await setup();
    await createSubAccount(db, finance, { companyId: cva.id, parentCode: "1101", code: "110150", name: "Bank BCA" });
    const bank = await accountId(cva.id, "110150");
    const sale = await cashSale(cva.id);
    const { id } = await saveDraft(db, finance, { ...sale, lines: [{ ...sale.lines[0], accountId: bank }, sale.lines[1]] });
    await postEntry(db, finance, id);

    await expect(
      createSubAccount(db, finance, { companyId: cva.id, parentCode: "110150", code: "11015050", name: "X" }),
    ).rejects.toThrow(/diposting/);
    await expect(setAccountActive(db, finance, { accountId: bank, active: false })).rejects.toThrow(/saldo/);

    // 410101 holds the sale's credit, so dropping it from the template keeps it.
    await syncChartTemplate(db, TEMPLATE.filter((a) => a.code !== "410101"));
    const [{ count }] = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from chart_account where company_id = ${cva.id} and code = '410101'`,
    ).then((r) => r.rows);
    expect(count).toBe(1);
  });
});
