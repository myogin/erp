import ExcelJS from "exceljs";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { requireCompany } from "@/lib/session";
import { businessDate } from "@/lib/time";
import { canViewChartOfAccounts, getJournalEntry, JOURNAL_STATUS_LABELS, JOURNAL_STATUSES, listJournalEntries, type JournalStatus } from "@/modules/accounting";

/**
 * Journal Entries as .xlsx, one row per Journal Line, honouring the list's search
 * and status filter (docs/ui.md: main tables offer Ekspor Excel).
 */
export async function GET(request: Request, ctx: RouteContext<"/[company]/jurnal/ekspor">) {
  const { company: code } = await ctx.params;
  const { user, company } = await requireCompany(code);
  if (!canViewChartOfAccounts(user.grants, company.id)) notFound();
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const status = JOURNAL_STATUSES.find((s) => s === url.searchParams.get("status")) as JournalStatus | undefined;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Jurnal");
  sheet.columns = [
    { header: "Nomor", key: "number", width: 24 },
    { header: "Tanggal", key: "date", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Keterangan", key: "description", width: 40 },
    { header: "Kode Akun", key: "code", width: 12 },
    { header: "Nama Akun", key: "account", width: 36 },
    { header: "Keterangan Baris", key: "lineDescription", width: 30 },
    { header: "Debit", key: "debit", width: 18, style: { numFmt: "#,##0.00" } },
    { header: "Kredit", key: "credit", width: 18, style: { numFmt: "#,##0.00" } },
  ];
  sheet.getRow(1).font = { bold: true };

  const db = getDb();
  for (let page = 1; ; page++) {
    const { rows, total, pageSize } = await listJournalEntries(db, user, company.id, { search, status, page, pageSize: 100 });
    for (const row of rows) {
      const entry = await getJournalEntry(db, user, row.id);
      for (const line of entry.lines) {
        sheet.addRow({
          number: entry.documentNumber ?? "",
          // A calendar day: written as text so Excel doesn't shift it by a time zone.
          date: entry.date,
          status: JOURNAL_STATUS_LABELS[entry.status],
          description: entry.description,
          code: line.accountCode,
          account: line.accountName,
          lineDescription: line.description ?? "",
          // Exact decimals: Excel stores numbers as doubles, which is fine for display at 2 places.
          debit: Number(line.debit),
          credit: Number(line.credit),
        });
      }
    }
    if (page * pageSize >= total) break;
  }

  return new Response(await workbook.xlsx.writeBuffer(), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="jurnal-${company.code.toLowerCase()}-${businessDate()}.xlsx"`,
    },
  });
}
