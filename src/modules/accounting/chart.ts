import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { company } from "../access/schema";
import { chartAccount } from "./schema";
import { TEMPLATE, type TemplateAccount } from "./template";

// Creating and syncing Charts of Accounts from the COA Template. No permission
// checks: these run inside createCompany and at startup, never for a User.

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

function parentCodeOf(code: string): string | null {
  return code.length > 4 ? code.slice(0, -2) : null;
}

/**
 * Brings one Company's template Accounts in line with `template`: adds missing
 * ones, updates changed names, types and parents, and deletes Accounts that
 * left the template unless something still sits beneath them. Sub-accounts are
 * left alone apart from following their parent's type.
 */
export async function syncCompanyChart(tx: Executor, companyId: string, template: TemplateAccount[] = TEMPLATE) {
  const templateCodes = new Set(template.map((a) => a.code));
  for (const account of template) {
    const parent = parentCodeOf(account.code);
    if (parent && !templateCodes.has(parent)) throw new Error(`COA Template ${account.code}: parent ${parent} is missing`);
  }

  const existing = await tx.select().from(chartAccount).where(eq(chartAccount.companyId, companyId));
  const byCode = new Map(existing.map((a) => [a.code, a]));
  const ids = new Map(existing.map((a) => [a.code, a.id]));

  // Level by level, so every parent exists before its children are inserted.
  const levels = [...new Set(template.map((a) => a.code.length))].sort((a, b) => a - b);
  for (const length of levels) {
    const missing = [];
    for (const account of template.filter((a) => a.code.length === length)) {
      const parentCode = parentCodeOf(account.code);
      const parentId = parentCode ? ids.get(parentCode)! : null;
      const current = byCode.get(account.code);
      if (!current) {
        missing.push({ companyId, code: account.code, name: account.name, type: account.type, parentId, fromTemplate: true, isHeader: account.header });
      } else if (current.name !== account.name || current.type !== account.type || current.parentId !== parentId) {
        await tx.update(chartAccount).set({ name: account.name, type: account.type, parentId }).where(eq(chartAccount.id, current.id));
      }
    }
    if (missing.length === 0) continue;
    const inserted = await tx.insert(chartAccount).values(missing).returning({ id: chartAccount.id, code: chartAccount.code });
    for (const row of inserted) ids.set(row.code, row.id);
  }

  // Deepest first, so a removed child goes before its removed parent is checked.
  const removed = existing.filter((a) => a.fromTemplate && !templateCodes.has(a.code)).sort((a, b) => b.code.length - a.code.length);
  for (const account of removed) {
    // #6 must also keep an Account that Journal Entries use.
    await tx.execute(
      sql`delete from ${chartAccount} where id = ${account.id} and not exists (select 1 from ${chartAccount} c where c.parent_id = ${account.id})`,
    );
  }

  const headers = template.filter((a) => a.header).map((a) => a.code);
  await tx.execute(sql`
    update ${chartAccount} a
    set is_header = (a.from_template and a.code in ${headers}) or exists (select 1 from ${chartAccount} c where c.parent_id = a.id)
    where a.company_id = ${companyId}`);

  // A retyped template Account carries its Sub-accounts along, one level per pass.
  for (;;) {
    const result = await tx.execute(sql`
      update ${chartAccount} s set type = p.type
      from ${chartAccount} p
      where s.parent_id = p.id and s.company_id = ${companyId} and not s.from_template and s.type <> p.type`);
    if (!result.rowCount) break;
  }
}

/** Gives a newly created Company its Chart of Accounts, inside the Company's own transaction. */
export async function createChartOfAccounts(tx: Executor, companyId: string): Promise<void> {
  await syncCompanyChart(tx, companyId);
}

/** Syncs every Company's Chart of Accounts with the template. Runs at startup, after migrations. */
export async function syncChartTemplate(db: Db, template: TemplateAccount[] = TEMPLATE): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('erp.chart_template_sync'))`);
    const companies = await tx.select({ id: company.id }).from(company);
    for (const { id } of companies) await syncCompanyChart(tx, id, template);
  });
}
