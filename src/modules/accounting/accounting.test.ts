import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { company as companyTable } from "@/modules/access/schema";
import { resetDb, connectTestDb } from "../../../test/db";
import { AccessDeniedError, bootstrapOwner, createCompany, createUser, grantRole, listAuditLog, type Actor, type Role } from "@/modules/access";
import {
  AccountingRuleError,
  createSubAccount,
  listChartOfAccounts,
  renameAccount,
  setAccountActive,
  suggestSubAccountCode,
  syncChartTemplate,
  TEMPLATE,
  type TemplateAccount,
} from ".";
import { chartAccount } from "./schema";

const db = connectTestDb();
const OWNER_EMAIL = "owner@example.com";

async function setupOwner(): Promise<Actor> {
  return bootstrapOwner(db, { name: "Owner", email: OWNER_EMAIL, password: "password-owner", allowedEmail: OWNER_EMAIL });
}

async function userWith(owner: Actor, email: string, role: Role, companyId?: string): Promise<Actor> {
  const { userId } = await createUser(db, owner, { name: email, email });
  await grantRole(db, owner, { userId, role, companyId });
  return { userId };
}

async function accountByCode(companyId: string, code: string) {
  const [row] = await db
    .select()
    .from(chartAccount)
    .where(and(eq(chartAccount.companyId, companyId), eq(chartAccount.code, code)));
  return row;
}

beforeEach(() => resetDb(db));

describe("Chart of Accounts from the COA Template", () => {
  it("is created with the Company, from the template", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });

    const rows = await listChartOfAccounts(db, owner, cva.id);
    expect(rows.map((r) => r.code)).toEqual(TEMPLATE.map((a) => a.code).sort());
    expect(rows.every((r) => r.fromTemplate && r.isActive)).toBe(true);

    const bank = await accountByCode(cva.id, "1101");
    const pettyCash = await accountByCode(cva.id, "110101");
    expect(bank).toMatchObject({ isHeader: true, parentId: null, type: "CASH_BANK" });
    expect(pettyCash).toMatchObject({ isHeader: false, parentId: bank.id, name: "Kas Kecil" });
  });

  it("gives every Company the same codes for template Accounts", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const cvb = await createCompany(db, owner, { code: "CVB", name: "CV B" });
    const codes = async (id: string) => (await listChartOfAccounts(db, owner, id)).map((r) => [r.code, r.name, r.type]);
    expect(await codes(cva.id)).toEqual(await codes(cvb.id));
  });

  it("is created for a Company that has none when the template is synced", async () => {
    const [legacy] = await db.insert(companyTable).values({ code: "OLD", name: "Old CV" }).returning();
    await syncChartTemplate(db);
    await syncChartTemplate(db); // idempotent

    const owner = await setupOwner();
    expect(await listChartOfAccounts(db, owner, legacy.id)).toHaveLength(TEMPLATE.length);
  });

  it("follows template changes on sync, keeping Sub-accounts and dropping only unused removed Accounts", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    await createSubAccount(db, owner, { companyId: cva.id, parentCode: "1101", code: "110150", name: "Bank BCA" });

    const changed: TemplateAccount[] = TEMPLATE.filter((a) => a.code !== "110509" && a.code !== "1101" && a.code !== "110101")
      .map((a) => (a.code === "110301" ? { ...a, name: "Piutang Usaha" } : a))
      .concat({ code: "110307", name: "Piutang Baru", type: "ACCOUNT_RECEIVABLE", header: false });
    await syncChartTemplate(db, changed);

    expect(await accountByCode(cva.id, "110307")).toMatchObject({ name: "Piutang Baru", fromTemplate: true });
    expect((await accountByCode(cva.id, "110301")).name).toBe("Piutang Usaha");
    expect(await accountByCode(cva.id, "110509")).toBeUndefined();
    expect(await accountByCode(cva.id, "110101")).toBeUndefined();
    // 1101 left the template but still holds a Sub-account, so it stays.
    expect(await accountByCode(cva.id, "1101")).toBeDefined();
    expect(await accountByCode(cva.id, "110150")).toMatchObject({ name: "Bank BCA", fromTemplate: false });
  });
});

describe("Sub-accounts", () => {
  it("lets Finance add one to their own Company; the parent becomes a Header Account", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const finance = await userWith(owner, "fin@example.com", "finance", cva.id);

    await createSubAccount(db, finance, { companyId: cva.id, parentCode: "510201", code: "51020150", name: "Biaya Bahan Baku - Mangga" });

    const parent = await accountByCode(cva.id, "510201");
    expect(parent.isHeader).toBe(true);
    expect(await accountByCode(cva.id, "51020150")).toMatchObject({ type: "COGS", parentId: parent.id, fromTemplate: false, isHeader: false });

    const { rows } = await listAuditLog(db, owner);
    expect(rows[0]).toMatchObject({ action: "account.create", companyCode: "CVA", details: { code: "51020150", name: "Biaya Bahan Baku - Mangga" } });
  });

  it("is only for the Company's own Finance and the Owner", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const cvb = await createCompany(db, owner, { code: "CVB", name: "CV B" });
    const financeB = await userWith(owner, "finb@example.com", "finance", cvb.id);
    const management = await userWith(owner, "mgmt@example.com", "management", cva.id);
    const admin = await userWith(owner, "admin@example.com", "admin");

    const input = { companyId: cva.id, parentCode: "1101", code: "110150", name: "Bank BCA" };
    await expect(createSubAccount(db, financeB, input)).rejects.toThrow(AccessDeniedError);
    await expect(createSubAccount(db, management, input)).rejects.toThrow(AccessDeniedError);
    await expect(createSubAccount(db, admin, input)).rejects.toThrow(AccessDeniedError);
    await createSubAccount(db, owner, input);
  });

  it("can be nested, and must use the parent code plus 50-99, once per Company", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const cvb = await createCompany(db, owner, { code: "CVB", name: "CV B" });
    const add = (companyId: string, parentCode: string, code: string) =>
      createSubAccount(db, owner, { companyId, parentCode, code, name: `Akun ${code}` });

    await add(cva.id, "1101", "110150");
    await add(cva.id, "110150", "11015050");
    await add(cvb.id, "1101", "110150"); // another Company may reuse the code

    await expect(add(cva.id, "1101", "110150")).rejects.toThrow(AccountingRuleError);
    await expect(add(cva.id, "1101", "110110")).rejects.toThrow(/50–99/);
    await expect(add(cva.id, "1101", "120150")).rejects.toThrow(/kode induk/);
    await expect(add(cva.id, "1101", "1101500")).rejects.toThrow(/kode induk/);
  });

  it("is also enforced by the database", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const parent = await accountByCode(cva.id, "1101");
    await expect(
      db.insert(chartAccount).values({ companyId: cva.id, code: "110110", name: "X", type: "CASH_BANK", parentId: parent.id, fromTemplate: false }),
    ).rejects.toThrow();
  });

  it("suggests the next free code", () => {
    expect(suggestSubAccountCode("1101", ["110101"])).toBe("110150");
    expect(suggestSubAccountCode("1101", ["110150", "110151"])).toBe("110152");
    const all = Array.from({ length: 50 }, (_, i) => `1101${50 + i}`);
    expect(suggestSubAccountCode("1101", all)).toBeNull();
  });

  it("can be renamed but template Accounts cannot", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const sub = await createSubAccount(db, owner, { companyId: cva.id, parentCode: "1101", code: "110150", name: "Bank BCA" });

    await renameAccount(db, owner, { accountId: sub.id, name: "Bank BCA - 1133" });
    expect(await accountByCode(cva.id, "110150")).toMatchObject({ name: "Bank BCA - 1133", code: "110150" });

    const template = await accountByCode(cva.id, "110101");
    await expect(renameAccount(db, owner, { accountId: template.id, name: "Kas" })).rejects.toThrow(AccountingRuleError);
    await expect(setAccountActive(db, owner, { accountId: template.id, active: false })).rejects.toThrow(AccountingRuleError);
  });

  it("can be deactivated only without active Sub-accounts beneath it, and then takes no new ones", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const bank = await createSubAccount(db, owner, { companyId: cva.id, parentCode: "1101", code: "110150", name: "Bank BCA" });
    const usd = await createSubAccount(db, owner, { companyId: cva.id, parentCode: "110150", code: "11015050", name: "Bank BCA USD" });

    await expect(setAccountActive(db, owner, { accountId: bank.id, active: false })).rejects.toThrow(AccountingRuleError);
    await setAccountActive(db, owner, { accountId: usd.id, active: false });
    await setAccountActive(db, owner, { accountId: bank.id, active: false });

    await expect(
      createSubAccount(db, owner, { companyId: cva.id, parentCode: "110150", code: "11015051", name: "X" }),
    ).rejects.toThrow(AccountingRuleError);
    await expect(setAccountActive(db, owner, { accountId: usd.id, active: true })).rejects.toThrow(AccountingRuleError);
    await setAccountActive(db, owner, { accountId: bank.id, active: true });
    expect((await accountByCode(cva.id, "110150")).isActive).toBe(true);
  });
});

describe("reading the Chart of Accounts", () => {
  it("is for the Owner and the Company's Finance and Management, not Admin or HR", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const cvb = await createCompany(db, owner, { code: "CVB", name: "CV B" });

    for (const role of ["finance", "management"] as const) {
      const actor = await userWith(owner, `${role}@example.com`, role, cva.id);
      expect(await listChartOfAccounts(db, actor, cva.id)).toHaveLength(TEMPLATE.length);
      await expect(listChartOfAccounts(db, actor, cvb.id)).rejects.toThrow(AccessDeniedError);
    }
    const admin = await userWith(owner, "admin@example.com", "admin");
    const hr = await userWith(owner, "hr@example.com", "hr", cva.id);
    await expect(listChartOfAccounts(db, admin, cva.id)).rejects.toThrow(AccessDeniedError);
    await expect(listChartOfAccounts(db, hr, cva.id)).rejects.toThrow(AccessDeniedError);
  });
});
