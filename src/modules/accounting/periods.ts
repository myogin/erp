import { and, asc, eq, min, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { user } from "@/db/auth-schema";
import { businessMonth, formatMonth, nextMonth } from "@/lib/time";
import { AccessDeniedError, getGrants, writeAuditLog, type Actor } from "@/modules/access";
import { AccountingRuleError } from "./errors";
import { journalEntry, periodClose } from "./schema";
import { requireEdit, requireView } from "./service";

// Accounting Periods are calendar months per Company. A closed one is a row in
// period_close; a trigger refuses any Posting dated inside it (ADR-0003).

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Bulan tidak valid.");
const reasonSchema = z.string().trim().min(1, "Alasan wajib diisi.");

/**
 * Posting takes this lock shared and closing or reopening takes it exclusive,
 * so a Posting never slips into a month while it is being closed.
 */
export async function lockPeriods(tx: Tx, companyId: string, mode: "shared" | "exclusive"): Promise<void> {
  const key = `erp.periods:${companyId}`;
  await tx.execute(
    mode === "shared" ? sql`select pg_advisory_xact_lock_shared(hashtext(${key}))` : sql`select pg_advisory_xact_lock(hashtext(${key}))`,
  );
}

/** Throws when `date` (YYYY-MM-DD) falls in a closed Accounting Period. */
export async function assertPeriodOpen(tx: Executor, companyId: string, date: string): Promise<void> {
  const month = date.slice(0, 7);
  const [closed] = await tx
    .select({ period: periodClose.period })
    .from(periodClose)
    .where(and(eq(periodClose.companyId, companyId), eq(periodClose.period, `${month}-01`)));
  if (closed) throw new AccountingRuleError(`Periode ${formatMonth(month)} sudah ditutup.`);
}

/** The latest closed month, and the month that must close next (null until something is posted). */
async function periodState(tx: Executor, companyId: string) {
  const [{ firstPosted }] = await tx
    .select({ firstPosted: min(journalEntry.date) })
    .from(journalEntry)
    .where(and(eq(journalEntry.companyId, companyId), eq(journalEntry.status, "posted")));
  const [{ last }] = await tx
    .select({ last: sql<string | null>`max(${periodClose.period})::text` })
    .from(periodClose)
    .where(eq(periodClose.companyId, companyId));
  const lastClosed = last?.slice(0, 7) ?? null;
  const nextToClose = lastClosed ? nextMonth(lastClosed) : (firstPosted?.slice(0, 7) ?? null);
  return { firstPosted: firstPosted?.slice(0, 7) ?? null, lastClosed, nextToClose };
}

async function draftCount(tx: Executor, companyId: string, month: string): Promise<number> {
  const [{ drafts }] = await tx
    .select({ drafts: sql<number>`count(*)::int` })
    .from(journalEntry)
    .where(
      and(eq(journalEntry.companyId, companyId), eq(journalEntry.status, "draft"), sql`to_char(${journalEntry.date}, 'YYYY-MM') = ${month}`),
    );
  return drafts;
}

export type PeriodRow = { month: string; closed: boolean; closedAt: Date | null; closedByName: string | null; draftCount: number };

/** Every month from the first posted (or closed) one to the current month, oldest first. */
export async function listPeriods(db: Db, actor: Actor, companyId: string) {
  await requireView(db, actor, companyId);
  const { firstPosted, lastClosed, nextToClose } = await periodState(db, companyId);
  const closed = await db
    .select({ period: periodClose.period, closedAt: periodClose.closedAt, closedByName: user.name })
    .from(periodClose)
    .leftJoin(user, eq(user.id, periodClose.closedBy))
    .where(eq(periodClose.companyId, companyId))
    .orderBy(asc(periodClose.period));
  const drafts = await db
    .select({ month: sql<string>`to_char(${journalEntry.date}, 'YYYY-MM')`, count: sql<number>`count(*)::int` })
    .from(journalEntry)
    .where(and(eq(journalEntry.companyId, companyId), eq(journalEntry.status, "draft")))
    .groupBy(sql`1`);

  const current = businessMonth();
  const start = [firstPosted, closed[0]?.period.slice(0, 7)].filter((m): m is string => !!m).sort()[0];
  const months: PeriodRow[] = [];
  for (let month = start; month && month <= current; month = nextMonth(month)) {
    const closing = closed.find((c) => c.period.startsWith(month));
    months.push({
      month,
      closed: !!closing,
      closedAt: closing?.closedAt ?? null,
      closedByName: closing?.closedByName ?? null,
      draftCount: drafts.find((d) => d.month === month)?.count ?? 0,
    });
  }
  return { months, lastClosed, nextToClose, currentMonth: current };
}

/** Closes `month`, which must be the next in order, already ended and free of Drafts. */
export async function closePeriod(db: Db, actor: Actor, input: { companyId: string; month: string }): Promise<void> {
  const month = monthSchema.parse(input.month);
  await db.transaction(async (tx) => {
    await requireEdit(tx, actor, input.companyId);
    await lockPeriods(tx, input.companyId, "exclusive");
    const { nextToClose } = await periodState(tx, input.companyId);
    if (!nextToClose) throw new AccountingRuleError("Belum ada jurnal yang diposting, jadi belum ada periode untuk ditutup.");
    if (month !== nextToClose) {
      throw new AccountingRuleError(`Tutup buku harus berurutan. Periode berikutnya yang bisa ditutup: ${formatMonth(nextToClose)}.`);
    }
    if (month >= businessMonth()) throw new AccountingRuleError(`${formatMonth(month)} belum berakhir.`);
    const drafts = await draftCount(tx, input.companyId, month);
    if (drafts > 0) {
      throw new AccountingRuleError(`Masih ada ${drafts} draf bertanggal ${formatMonth(month)}. Posting atau hapus dulu.`);
    }

    await tx.insert(periodClose).values({ companyId: input.companyId, period: `${month}-01`, closedBy: actor.userId });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "period.close",
      companyId: input.companyId,
      targetType: "period",
      targetId: month,
      details: { period: month },
    });
  });
}

/** Reopens the latest closed month. Owner only, with a reason (ADR-0006: the Owner holds final authority). */
export async function reopenPeriod(db: Db, actor: Actor, input: { companyId: string; month: string; reason: string }): Promise<void> {
  const month = monthSchema.parse(input.month);
  const reason = reasonSchema.parse(input.reason);
  await db.transaction(async (tx) => {
    const grants = await getGrants(tx, actor.userId);
    if (!grants.some((g) => g.role === "owner" && g.companyId === null)) {
      throw new AccessDeniedError("Hanya Pemilik yang bisa membuka kembali periode.");
    }
    await lockPeriods(tx, input.companyId, "exclusive");
    const { lastClosed } = await periodState(tx, input.companyId);
    if (!lastClosed) throw new AccountingRuleError("Belum ada periode yang ditutup.");
    if (month !== lastClosed) {
      throw new AccountingRuleError(`Hanya periode tertutup terakhir (${formatMonth(lastClosed)}) yang bisa dibuka kembali.`);
    }

    await tx.delete(periodClose).where(and(eq(periodClose.companyId, input.companyId), eq(periodClose.period, `${month}-01`)));
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "period.reopen",
      companyId: input.companyId,
      targetType: "period",
      targetId: month,
      details: { period: month, reason },
    });
  });
}
