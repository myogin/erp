import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import type { Db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { formatRupiah, money, type Money } from "@/lib/money";
import { businessDate } from "@/lib/time";
import { AccessDeniedError, getGrants, writeAuditLog, type Actor } from "@/modules/access";
import { company } from "@/modules/access/schema";
import { AccountingRuleError } from "./errors";
import { canEditChartOfAccounts, formatDocumentNumber, type JournalStatus } from "./rules";
import { chartAccount, documentSequence, journalEntry, journalLine } from "./schema";
import { requireEdit, requireView } from "./service";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

// ---------------------------------------------------------------------------
// Input

const amount = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const value = v === "" ? money(0) : (() => {
      try {
        return money(v);
      } catch {
        return null;
      }
    })();
    if (!value || value.isNegative()) {
      ctx.addIssue({ code: "custom", message: "Nominal tidak valid." });
      return z.NEVER;
    }
    if (value.decimalPlaces() > 2) {
      ctx.addIssue({ code: "custom", message: "Nominal maksimal 2 angka di belakang koma." });
      return z.NEVER;
    }
    return value;
  });

const lineInput = z
  .object({
    accountId: z.uuid("Akun wajib dipilih."),
    debit: amount,
    credit: amount,
    description: z
      .string()
      .trim()
      .transform((v) => v || null)
      .nullish(),
  })
  .refine((l) => l.debit.isZero() !== l.credit.isZero(), "Setiap baris diisi debit atau kredit, tidak keduanya.");

const draftInput = z.object({
  entryId: z.uuid().optional(),
  companyId: z.uuid(),
  date: z.iso.date("Tanggal tidak valid.").refine((d) => d <= businessDate(), "Tanggal jurnal tidak boleh di masa depan."),
  description: z.string().trim().min(1, "Keterangan jurnal wajib diisi."),
  lines: z.array(lineInput).min(1, "Isi minimal satu baris."),
});

export type JournalLineInput = { accountId: string; debit: string; credit: string; description?: string | null };
export type DraftInput = { entryId?: string; companyId: string; date: string; description: string; lines: JournalLineInput[] };

/** Every Account must belong to the Company, be active and not a Header Account. */
async function assertPostableAccounts(tx: Tx, companyId: string, accountIds: string[]): Promise<void> {
  const ids = [...new Set(accountIds)];
  const accounts = await tx
    .select()
    .from(chartAccount)
    .where(and(eq(chartAccount.companyId, companyId), inArray(chartAccount.id, ids)))
    .for("share");
  if (accounts.length !== ids.length) throw new AccountingRuleError("Akun tidak ditemukan.");
  for (const a of accounts) {
    if (a.isHeader) throw new AccountingRuleError(`${a.code} ${a.name} adalah akun induk dan tidak bisa dipakai untuk mencatat transaksi.`);
    if (!a.isActive) throw new AccountingRuleError(`${a.code} ${a.name} nonaktif.`);
  }
}

async function lockEntry(tx: Tx, entryId: string) {
  const [entry] = await tx.select().from(journalEntry).where(eq(journalEntry.id, entryId)).for("update");
  if (!entry) throw new AccountingRuleError("Jurnal tidak ditemukan.");
  return entry;
}

// ---------------------------------------------------------------------------
// Drafts

/** Creates a Draft, or replaces the content of an existing one. A Draft may be unbalanced. */
export async function saveDraft(db: Db, actor: Actor, input: DraftInput): Promise<{ id: string }> {
  const data = draftInput.parse(input);
  return db.transaction((tx) => writeDraft(tx, actor, data));
}

/** Saves and posts in one transaction, so a Posting that fails leaves nothing behind. */
export async function saveAndPost(db: Db, actor: Actor, input: DraftInput): Promise<{ id: string; documentNumber: string }> {
  const data = draftInput.parse(input);
  return db.transaction(async (tx) => {
    const { id } = await writeDraft(tx, actor, data);
    return { id, ...(await post(tx, actor, id)) };
  });
}

async function writeDraft(tx: Tx, actor: Actor, data: z.output<typeof draftInput>): Promise<{ id: string }> {
  await requireEdit(tx, actor, data.companyId);
  await assertPostableAccounts(tx, data.companyId, data.lines.map((l) => l.accountId));

  let id = data.entryId;
  if (id) {
    const entry = await lockEntry(tx, id);
    if (entry.companyId !== data.companyId) throw new AccountingRuleError("Jurnal tidak ditemukan.");
    if (entry.status === "posted") throw new AccountingRuleError("Jurnal yang sudah diposting tidak bisa diubah.");
    await tx
      .update(journalEntry)
      .set({ date: data.date, description: data.description, updatedAt: new Date() })
      .where(eq(journalEntry.id, id));
    await tx.delete(journalLine).where(eq(journalLine.entryId, id));
  } else {
    const [created] = await tx
      .insert(journalEntry)
      .values({ companyId: data.companyId, documentType: "JV", date: data.date, description: data.description, createdBy: actor.userId })
      .returning({ id: journalEntry.id });
    id = created.id;
  }

  await tx.insert(journalLine).values(
    data.lines.map((line, i) => ({
      entryId: id,
      lineNo: i + 1,
      accountId: line.accountId,
      debit: line.debit.toFixed(2),
      credit: line.credit.toFixed(2),
      description: line.description ?? null,
    })),
  );
  return { id };
}

export async function deleteDraft(db: Db, actor: Actor, entryId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const entry = await lockEntry(tx, entryId);
    await requireEdit(tx, actor, entry.companyId);
    if (entry.status === "posted") throw new AccountingRuleError("Jurnal yang sudah diposting tidak bisa dihapus.");
    await tx.delete(journalEntry).where(eq(journalEntry.id, entryId));
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "journal.delete_draft",
      companyId: entry.companyId,
      targetType: "journal_entry",
      targetId: entryId,
      details: { description: entry.description },
    });
  });
}

// ---------------------------------------------------------------------------
// Posting

/**
 * Makes a Draft final: checks it balances, gives it the next Document Number
 * for its year and locks it for good. The number's sequence row stays locked
 * until this transaction commits, so concurrent Postings never leave a gap.
 */
export async function postEntry(db: Db, actor: Actor, entryId: string): Promise<{ documentNumber: string }> {
  return db.transaction((tx) => post(tx, actor, entryId));
}

async function post(tx: Tx, actor: Actor, entryId: string): Promise<{ documentNumber: string }> {
  const entry = await lockEntry(tx, entryId);
  await requireEdit(tx, actor, entry.companyId);
  if (entry.status === "posted") throw new AccountingRuleError("Jurnal ini sudah diposting.");
  if (entry.date > businessDate()) throw new AccountingRuleError("Tanggal jurnal tidak boleh di masa depan.");

  const lines = await tx.select().from(journalLine).where(eq(journalLine.entryId, entryId));
  if (lines.length < 2) throw new AccountingRuleError("Jurnal perlu minimal 2 baris.");
  await assertPostableAccounts(tx, entry.companyId, lines.map((l) => l.accountId));
  const debit = lines.reduce((sum, l) => sum.plus(l.debit), money(0));
  const credit = lines.reduce((sum, l) => sum.plus(l.credit), money(0));
  if (!debit.equals(credit)) {
    throw new AccountingRuleError(`Debit dan kredit belum seimbang: selisih ${formatRupiah(debit.minus(credit).abs())}.`);
  }

  const year = Number(entry.date.slice(0, 4));
  const [{ lastNumber }] = await tx
    .insert(documentSequence)
    .values({ companyId: entry.companyId, documentType: entry.documentType, year, lastNumber: 1 })
    .onConflictDoUpdate({
      target: [documentSequence.companyId, documentSequence.documentType, documentSequence.year],
      set: { lastNumber: sql`${documentSequence.lastNumber} + 1` },
    })
    .returning({ lastNumber: documentSequence.lastNumber });
  const [{ code }] = await tx.select({ code: company.code }).from(company).where(eq(company.id, entry.companyId));
  const documentNumber = formatDocumentNumber(entry.documentType, code, year, lastNumber);

  await tx
    .update(journalEntry)
    .set({ status: "posted", year, sequence: lastNumber, documentNumber, postedBy: actor.userId, postedAt: new Date() })
    .where(eq(journalEntry.id, entryId));
  await writeAuditLog(tx, {
    actorUserId: actor.userId,
    action: "journal.post",
    companyId: entry.companyId,
    targetType: "journal_entry",
    targetId: entryId,
    details: { number: documentNumber, total: debit.toFixed(2) },
  });
  return { documentNumber };
}

// ---------------------------------------------------------------------------
// Reading

export type JournalListQuery = {
  page?: number;
  pageSize?: number;
  /** Matches the description or the Document Number. */
  search?: string;
  status?: JournalStatus;
};

/** Newest first. Management sees posted entries only: a Draft isn't part of the books yet. */
export async function listJournalEntries(db: Db, actor: Actor, companyId: string, query: JournalListQuery = {}) {
  await requireView(db, actor, companyId);
  const canEdit = canEditChartOfAccounts(await getGrants(db, actor.userId), companyId);
  const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const status = canEdit ? query.status : "posted";
  const term = query.search?.trim();
  const where = and(
    eq(journalEntry.companyId, companyId),
    status ? eq(journalEntry.status, status) : undefined,
    term ? or(ilike(journalEntry.description, `%${term}%`), ilike(journalEntry.documentNumber, `%${term}%`)) : undefined,
  );

  const [{ total }] = await db.select({ total: count() }).from(journalEntry).where(where);
  const rows = await db
    .select({
      id: journalEntry.id,
      status: journalEntry.status,
      date: journalEntry.date,
      description: journalEntry.description,
      documentNumber: journalEntry.documentNumber,
      // Qualified by hand: inside a subquery Drizzle would leave both ids unqualified.
      total: sql<string>`(select coalesce(sum(l.debit), 0)::numeric(18,2)::text from journal_line l where l.entry_id = "journal_entry"."id")`,
    })
    .from(journalEntry)
    .where(where)
    .orderBy(desc(journalEntry.date), desc(journalEntry.sequence), desc(journalEntry.createdAt), asc(journalEntry.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { rows, total, page, pageSize };
}

const creator = alias(user, "creator");
const poster = alias(user, "poster");

/** One Journal Entry with its lines, and who created and posted it. */
export async function getJournalEntry(db: Executor, actor: Actor, entryId: string) {
  const [row] = await db
    .select({ entry: journalEntry, createdByName: creator.name, postedByName: poster.name })
    .from(journalEntry)
    .leftJoin(creator, eq(creator.id, journalEntry.createdBy))
    .leftJoin(poster, eq(poster.id, journalEntry.postedBy))
    .where(eq(journalEntry.id, entryId));
  const entry = row ? { ...row.entry, createdByName: row.createdByName, postedByName: row.postedByName } : null;
  if (!entry) throw new AccountingRuleError("Jurnal tidak ditemukan.");
  await requireView(db, actor, entry.companyId);
  if (entry.status === "draft" && !canEditChartOfAccounts(await getGrants(db, actor.userId), entry.companyId)) {
    throw new AccessDeniedError();
  }
  const lines = await db
    .select({
      id: journalLine.id,
      lineNo: journalLine.lineNo,
      accountId: journalLine.accountId,
      accountCode: chartAccount.code,
      accountName: chartAccount.name,
      debit: journalLine.debit,
      credit: journalLine.credit,
      description: journalLine.description,
    })
    .from(journalLine)
    .innerJoin(chartAccount, eq(chartAccount.id, journalLine.accountId))
    .where(eq(journalLine.entryId, entryId))
    .orderBy(asc(journalLine.lineNo));
  return { ...entry, lines };
}

export type JournalEntryDetail = Awaited<ReturnType<typeof getJournalEntry>>;

/** Sum of a column of amounts given as decimal strings. */
export function sumAmounts(values: string[]): Money {
  return values.reduce((sum, v) => sum.plus(v || 0), money(0));
}
