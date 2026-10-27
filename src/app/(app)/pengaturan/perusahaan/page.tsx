import { PageHeader } from "@/components/page-header";
import { getDb } from "@/db/client";
import { listParams } from "@/lib/list-params";
import { requireAdministrator } from "@/lib/session";
import { listCompanies } from "@/modules/access";
import { CompaniesTable } from "./companies-table";
import { CreateCompanyDialog } from "./create-company-dialog";

const SORTS = ["code", "-code", "name", "-name"] as const;

export default async function CompaniesPage({ searchParams }: PageProps<"/pengaturan/perusahaan">) {
  const actor = await requireAdministrator();
  const list = await listCompanies(getDb(), actor, listParams(await searchParams, SORTS));
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Pengaturan" }]}
        title="Perusahaan"
        description="CV yang dikelola di ERP. Kode dipakai di alamat halaman dan nomor dokumen."
        actions={<CreateCompanyDialog />}
      />
      <CompaniesTable rows={list.rows} total={list.total} page={list.page} pageSize={list.pageSize} emptyAction={<CreateCompanyDialog />} />
    </>
  );
}
