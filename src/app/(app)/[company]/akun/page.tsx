import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/db/client";
import { requireCompany } from "@/lib/session";
import { canEditChartOfAccounts, canViewChartOfAccounts, listChartOfAccounts } from "@/modules/accounting";
import { AccountsTable } from "./accounts-table";

export default async function ChartOfAccountsPage({ params }: PageProps<"/[company]/akun">) {
  const { company: code } = await params;
  const { user, company } = await requireCompany(code);
  // Like an unknown Company: the URL doesn't reveal what the user can't open.
  if (!canViewChartOfAccounts(user.grants, company.id)) notFound();
  const rows = await listChartOfAccounts(getDb(), user, company.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Akuntansi" }]}
        title="Bagan Akun"
        description="Akun template sama di semua CV dan tidak bisa diubah di sini. Tambahkan sub-akun untuk rincian milik CV ini, mis. rekening bank."
      />
      <AccountsTable
        companyId={company.id}
        exportHref={`/${company.code.toLowerCase()}/akun/ekspor`}
        canEdit={canEditChartOfAccounts(user.grants, company.id)}
        rows={rows.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          type: r.type,
          depth: r.depth,
          isHeader: r.isHeader,
          isActive: r.isActive,
          fromTemplate: r.fromTemplate,
        }))}
      />
    </>
  );
}
