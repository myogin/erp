import ExcelJS from "exceljs";
import { getDb } from "@/db/client";
import { actionsMatchingLabel, auditActionLabel, formatAuditDetails } from "@/lib/audit-labels";
import { requireAdministrator } from "@/lib/session";
import { businessDate, witaWallClockAsUtc } from "@/lib/time";
import { listAuditLog } from "@/modules/access";

/** The audit log as .xlsx, honouring the table's search. Times are WITA. */
export async function GET(request: Request) {
  const actor = await requireAdministrator();
  const search = new URL(request.url).searchParams.get("q") ?? undefined;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Audit Log");
  sheet.columns = [
    { header: "Waktu (WITA)", key: "at", width: 20, style: { numFmt: "dd/mm/yyyy hh:mm" } },
    { header: "Pelaku", key: "actor", width: 24 },
    { header: "Tindakan", key: "action", width: 28 },
    { header: "Perusahaan", key: "company", width: 12 },
    { header: "Detail", key: "details", width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (let page = 1; ; page++) {
    const { rows, total, pageSize } = await listAuditLog(getDb(), actor, {
      search,
      matchingActions: actionsMatchingLabel(search),
      page,
      pageSize: 100,
    });
    for (const e of rows) {
      sheet.addRow({
        at: witaWallClockAsUtc(e.at), // Excel has no time zones
        actor: e.actorName ?? "",
        action: auditActionLabel(e.action),
        company: e.companyCode ?? "",
        details: formatAuditDetails(e.details),
      });
    }
    if (page * pageSize >= total) break;
  }

  return new Response(await workbook.xlsx.writeBuffer(), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="audit-log-${businessDate()}.xlsx"`,
    },
  });
}
