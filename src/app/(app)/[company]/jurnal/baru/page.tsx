import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/db/client";
import { requireCompany } from "@/lib/session";
import { canEditChartOfAccounts, listChartOfAccounts } from "@/modules/accounting";
import { JournalForm } from "../journal-form";

export default async function NewJournalPage({ params }: PageProps<"/[company]/jurnal/baru">) {
  const { company: code } = await params;
  const { user, company } = await requireCompany(code);
  if (!canEditChartOfAccounts(user.grants, company.id)) notFound();
  const base = `/${company.code.toLowerCase()}/jurnal`;
  const accounts = (await listChartOfAccounts(getDb(), user, company.id)).filter((a) => a.isActive && !a.isHeader);

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Akuntansi" }, { label: "Jurnal", href: base }]} title="Jurnal baru" />
      <JournalForm
        company={{ id: company.id, code: company.code }}
        accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
        cancelHref={base}
      />
    </>
  );
}
