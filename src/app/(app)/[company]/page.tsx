import { requireCompany } from "@/lib/session";
import { ROLE_LABELS } from "@/modules/access";

export default async function CompanyHomePage({ params }: PageProps<"/[company]">) {
  const { company: code } = await params;
  const { user, company } = await requireCompany(code);
  const roles = user.grants.filter((g) => g.companyId === null || g.companyId === company.id).map((g) => ROLE_LABELS[g.role]);

  return (
    <>
      <div>
        <p className="font-mono text-sm text-muted-foreground">{company.code}</p>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        {company.npwp && <p className="text-sm text-muted-foreground">NPWP {company.npwp}</p>}
      </div>
      <p className="text-sm">
        Peran Anda di sini: <span className="font-medium">{roles.join(", ")}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Modul Akuntansi dan Penggajian akan muncul di menu samping seiring pengembangan.
      </p>
    </>
  );
}
