import { PageHeader } from "@/components/page-header";
import { requireCompany } from "@/lib/session";
import { ROLE_LABELS } from "@/modules/access";

export default async function CompanyHomePage({ params }: PageProps<"/[company]">) {
  const { company: code } = await params;
  const { user, company } = await requireCompany(code);
  const roles = user.grants.filter((g) => g.companyId === null || g.companyId === company.id).map((g) => ROLE_LABELS[g.role]);

  return (
    <>
      <PageHeader
        title={company.name}
        description={
          <>
            <span className="font-mono">{company.code}</span>
            {company.npwp && <> · NPWP {company.npwp}</>}
          </>
        }
      />
      <p className="text-sm">
        Peran Anda di sini: <span className="font-medium">{roles.join(", ")}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Modul Akuntansi dan Penggajian akan muncul di menu samping seiring pengembangan.
      </p>
    </>
  );
}
