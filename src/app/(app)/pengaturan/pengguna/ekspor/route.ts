import ExcelJS from "exceljs";
import { getDb } from "@/db/client";
import { requireAdministrator } from "@/lib/session";
import { businessDate } from "@/lib/time";
import { listUsers, ROLE_LABELS } from "@/modules/access";

/** The user list as .xlsx, honouring the table's search (docs/ui.md: main tables offer Ekspor Excel). */
export async function GET(request: Request) {
  const actor = await requireAdministrator();
  const search = new URL(request.url).searchParams.get("q") ?? undefined;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pengguna");
  sheet.columns = [
    { header: "Nama", key: "name", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Peran", key: "roles", width: 48 },
    { header: "2FA", key: "twoFactor", width: 8 },
    { header: "Kata sandi sementara", key: "temporary", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (let page = 1; ; page++) {
    const { rows, total, pageSize } = await listUsers(getDb(), actor, { search, page, pageSize: 100 });
    for (const u of rows) {
      sheet.addRow({
        name: u.name,
        email: u.email,
        roles: u.grants.map((g) => `${ROLE_LABELS[g.role]} · ${g.companyCode ?? "semua"}`).join(", "),
        twoFactor: u.twoFactorEnabled ? "Ya" : "Tidak",
        temporary: u.mustChangePassword ? "Ya" : "Tidak",
      });
    }
    if (page * pageSize >= total) break;
  }

  return new Response(await workbook.xlsx.writeBuffer(), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="pengguna-${businessDate()}.xlsx"`,
    },
  });
}
