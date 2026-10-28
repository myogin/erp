import ExcelJS from "exceljs";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { requireCompany } from "@/lib/session";
import { businessDate } from "@/lib/time";
import { ACCOUNT_TYPES, canViewChartOfAccounts, listChartOfAccounts } from "@/modules/accounting";

/** The Chart of Accounts as .xlsx (docs/ui.md: main tables offer Ekspor Excel). */
export async function GET(_request: Request, ctx: RouteContext<"/[company]/akun/ekspor">) {
  const { company: code } = await ctx.params;
  const { user, company } = await requireCompany(code);
  if (!canViewChartOfAccounts(user.grants, company.id)) notFound();
  const rows = await listChartOfAccounts(getDb(), user, company.id);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bagan Akun");
  sheet.columns = [
    { header: "Kode", key: "code", width: 12 },
    { header: "Nama", key: "name", width: 44 },
    { header: "Jenis", key: "type", width: 24 },
    { header: "Induk", key: "header", width: 8 },
    { header: "Sub-akun", key: "sub", width: 10 },
    { header: "Aktif", key: "active", width: 8 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) {
    const row = sheet.addRow({
      code: r.code,
      name: r.name,
      type: ACCOUNT_TYPES[r.type],
      header: r.isHeader ? "Ya" : "",
      sub: r.fromTemplate ? "" : "Ya",
      active: r.isActive ? "Ya" : "Tidak",
    });
    row.getCell("name").alignment = { indent: r.depth * 2 };
    if (r.isHeader) row.font = { bold: true };
  }

  return new Response(await workbook.xlsx.writeBuffer(), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="bagan-akun-${company.code.toLowerCase()}-${businessDate()}.xlsx"`,
    },
  });
}
