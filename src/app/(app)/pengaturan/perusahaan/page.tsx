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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Perusahaan</h1>
          <p className="text-sm text-muted-foreground">CV yang dikelola di ERP. Kode dipakai di alamat halaman dan nomor dokumen.</p>
        </div>
        <CreateCompanyDialog />
      </div>
      <CompaniesTable rows={list.rows} total={list.total} page={list.page} pageSize={list.pageSize} />
    </>
  );
}
