import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { listParams } from "@/lib/list-params";
import { requireCompany } from "@/lib/session";
import { canEditChartOfAccounts, canViewChartOfAccounts, listJournalEntries, JOURNAL_STATUSES, type JournalStatus } from "@/modules/accounting";
import { JournalTable } from "./journal-table";

export default async function JournalsPage({ params, searchParams }: PageProps<"/[company]/jurnal">) {
  const { company: code } = await params;
  const { user, company } = await requireCompany(code);
  if (!canViewChartOfAccounts(user.grants, company.id)) notFound();
  const canEdit = canEditChartOfAccounts(user.grants, company.id);

  const query = await searchParams;
  const status = JOURNAL_STATUSES.find((s) => s === query.status) as JournalStatus | undefined;
  const list = await listJournalEntries(getDb(), user, company.id, { ...listParams(query), status });
  const base = `/${company.code.toLowerCase()}/jurnal`;
  const addButton = canEdit && (
    <Button asChild>
      <Link href={`${base}/baru`}>
        <PlusIcon /> Tambah jurnal
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Akuntansi" }]}
        title="Jurnal"
        description={
          canEdit
            ? "Jurnal umum. Draf bisa diubah; jurnal yang sudah diposting terkunci dan bernomor."
            : "Jurnal umum yang sudah diposting."
        }
        actions={addButton}
      />
      <JournalTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        base={base}
        showStatusFilter={canEdit}
        emptyAction={addButton || undefined}
      />
    </>
  );
}
