import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/db/client";
import { requireCompany } from "@/lib/session";
import { canEditChartOfAccounts, canViewChartOfAccounts, listPeriods } from "@/modules/accounting";
import { PeriodsTable } from "./periods-table";

export default async function PeriodClosePage({ params }: PageProps<"/[company]/tutup-buku">) {
  const { company: code } = await params;
  const { user, company } = await requireCompany(code);
  if (!canViewChartOfAccounts(user.grants, company.id)) notFound();
  const periods = await listPeriods(getDb(), user, company.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Akuntansi" }]}
        title="Tutup Buku"
        description="Bulan yang sudah ditutup tidak menerima jurnal baru. Bulan ditutup berurutan, setelah bulannya berakhir."
      />
      <PeriodsTable
        companyId={company.id}
        months={periods.months}
        nextToClose={periods.nextToClose}
        lastClosed={periods.lastClosed}
        currentMonth={periods.currentMonth}
        canClose={canEditChartOfAccounts(user.grants, company.id)}
        canReopen={user.grants.some((g) => g.role === "owner" && g.companyId === null)}
      />
    </>
  );
}
