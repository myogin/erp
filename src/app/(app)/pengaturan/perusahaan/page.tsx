import { Card } from "@/components/legacy-ui";
import { getDb } from "@/db/client";
import { requireAdministrator } from "@/lib/session";
import { listAccessibleCompanies } from "@/modules/access";
import { CreateCompanyForm } from "./create-company-form";

export default async function CompaniesPage() {
  const actor = await requireAdministrator();
  const companies = await listAccessibleCompanies(getDb(), actor);
  return (
    <>
      <h1 className="text-xl font-semibold">Perusahaan</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Kode</th>
            <th>Nama</th>
            <th>NPWP</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 font-mono">{c.code}</td>
              <td>{c.name}</td>
              <td>{c.npwp ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Card title="Tambah perusahaan">
        <CreateCompanyForm />
      </Card>
    </>
  );
}
