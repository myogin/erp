import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { money, type Money } from "@/lib/money";
import { AccessDeniedError, getGrants, writeAuditLog, type Actor } from "@/modules/access";
import { AccountingRuleError } from "./errors";
import { canEditChartOfAccounts, canViewChartOfAccounts, subAccountCodeProblem } from "./rules";
import { chartAccount, journalEntry, journalLine } from "./schema";

export type Account = typeof chartAccount.$inferSelect;
/** An Account with its depth in the tree (0 for the top-level Header Accounts). */
export type ChartRow = Account & { depth: number };

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

export async function requireView(db: Executor, actor: Actor, companyId: string): Promise<void> {
  if (!canViewChartOfAccounts(await getGrants(db, actor.userId), companyId)) throw new AccessDeniedError();
}

export async function requireEdit(db: Executor, actor: Actor, companyId: string): Promise<void> {
  if (!canEditChartOfAccounts(await getGrants(db, actor.userId), companyId)) throw new AccessDeniedError();
}

/** The whole Chart of Accounts in tree order: sorting by code puts every Account right after its parent. */
export async function listChartOfAccounts(db: Executor, actor: Actor, companyId: string): Promise<ChartRow[]> {
  await requireView(db, actor, companyId);
  const rows = await db.select().from(chartAccount).where(eq(chartAccount.companyId, companyId)).orderBy(asc(chartAccount.code));
  return rows.map((row) => ({ ...row, depth: (row.code.length - 4) / 2 }));
}

const nameSchema = z.string().trim().min(1, "Nama akun wajib diisi.");

const subAccountInput = z.object({
  companyId: z.uuid(),
  parentCode: z.string().trim(),
  code: z.string().trim(),
  name: nameSchema,
});

/** Adds a Sub-account beneath `parentCode`; the parent becomes a Header Account. */
export async function createSubAccount(
  db: Db,
  actor: Actor,
  input: { companyId: string; parentCode: string; code: string; name: string },
): Promise<Account> {
  const data = subAccountInput.parse(input);
  return db.transaction(async (tx) => {
    await requireEdit(tx, actor, data.companyId);
    const [parent] = await tx
      .select()
      .from(chartAccount)
      .where(and(eq(chartAccount.companyId, data.companyId), eq(chartAccount.code, data.parentCode)))
      .for("update");
    if (!parent) throw new AccountingRuleError("Akun induk tidak ditemukan.");
    if (!parent.isActive) throw new AccountingRuleError("Akun induk nonaktif. Aktifkan dulu sebelum menambah sub-akun.");
    const problem = subAccountCodeProblem(parent.code, data.code);
    if (problem) throw new AccountingRuleError(problem);
    // A Header Account can't hold Postings, so one that already has some can't become one.
    if (await hasPostings(tx, parent.id)) {
      throw new AccountingRuleError("Akun ini sudah dipakai di jurnal yang diposting, jadi tidak bisa diberi sub-akun.");
    }

    const [created] = await tx
      .insert(chartAccount)
      .values({ companyId: data.companyId, code: data.code, name: data.name, type: parent.type, parentId: parent.id, fromTemplate: false })
      .onConflictDoNothing()
      .returning();
    if (!created) throw new AccountingRuleError(`Kode ${data.code} sudah dipakai.`);
    if (!parent.isHeader) await tx.update(chartAccount).set({ isHeader: true }).where(eq(chartAccount.id, parent.id));

    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "account.create",
      companyId: data.companyId,
      targetType: "account",
      targetId: created.id,
      details: { code: created.code, name: created.name },
    });
    return created;
  });
}

async function hasPostings(tx: Executor, accountId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: journalLine.id })
    .from(journalLine)
    .innerJoin(journalEntry, eq(journalEntry.id, journalLine.entryId))
    .where(and(eq(journalLine.accountId, accountId), eq(journalEntry.status, "posted")))
    .limit(1);
  return !!row;
}

/** Posted debits minus credits on the Account. */
async function postedBalance(tx: Executor, accountId: string): Promise<Money> {
  const [row] = await tx
    .select({ balance: sql<string>`coalesce(sum(${journalLine.debit} - ${journalLine.credit}), 0)` })
    .from(journalLine)
    .innerJoin(journalEntry, eq(journalEntry.id, journalLine.entryId))
    .where(and(eq(journalLine.accountId, accountId), eq(journalEntry.status, "posted")));
  return money(row.balance);
}

/** The Sub-account to change, locked; template Accounts change only through the template. */
async function lockSubAccount(tx: Tx, actor: Actor, accountId: string, lockedMessage: string): Promise<Account> {
  const [account] = await tx.select().from(chartAccount).where(eq(chartAccount.id, accountId)).for("update");
  if (!account) throw new AccountingRuleError("Akun tidak ditemukan.");
  await requireEdit(tx, actor, account.companyId);
  if (account.fromTemplate) throw new AccountingRuleError(lockedMessage);
  return account;
}

export async function renameAccount(db: Db, actor: Actor, input: { accountId: string; name: string }): Promise<void> {
  const name = nameSchema.parse(input.name);
  await db.transaction(async (tx) => {
    const account = await lockSubAccount(tx, actor, input.accountId, "Akun template tidak bisa diganti namanya; perubahan dilakukan lewat COA Template.");
    if (account.name === name) return;
    await tx.update(chartAccount).set({ name }).where(eq(chartAccount.id, account.id));
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "account.rename",
      companyId: account.companyId,
      targetType: "account",
      targetId: account.id,
      details: { code: account.code, previousName: account.name, name },
    });
  });
}

/** Deactivating hides a Sub-account from pickers but keeps it in reports. */
export async function setAccountActive(db: Db, actor: Actor, input: { accountId: string; active: boolean }): Promise<void> {
  await db.transaction(async (tx) => {
    const account = await lockSubAccount(tx, actor, input.accountId, "Akun template tidak bisa dinonaktifkan.");
    if (account.isActive === input.active) return;

    if (input.active) {
      const [parent] = await tx.select({ isActive: chartAccount.isActive }).from(chartAccount).where(eq(chartAccount.id, account.parentId!));
      if (!parent.isActive) throw new AccountingRuleError("Akun induknya nonaktif. Aktifkan dulu akun induknya.");
    } else {
      const [activeChild] = await tx
        .select({ id: chartAccount.id })
        .from(chartAccount)
        .where(and(eq(chartAccount.parentId, account.id), eq(chartAccount.isActive, true)))
        .limit(1);
      if (activeChild) throw new AccountingRuleError("Nonaktifkan dulu sub-akun di bawahnya.");
      if (!(await postedBalance(tx, account.id)).isZero()) {
        throw new AccountingRuleError("Akun masih punya saldo, jadi belum bisa dinonaktifkan.");
      }
    }

    await tx.update(chartAccount).set({ isActive: input.active }).where(eq(chartAccount.id, account.id));
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: input.active ? "account.activate" : "account.deactivate",
      companyId: account.companyId,
      targetType: "account",
      targetId: account.id,
      details: { code: account.code, name: account.name },
    });
  });
}
