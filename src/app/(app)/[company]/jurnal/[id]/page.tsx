import { Trash2Icon } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmAction } from "@/components/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db/client";
import { formatRupiah, money } from "@/lib/money";
import { requireCompany } from "@/lib/session";
import { formatDateTime, formatIsoDate } from "@/lib/time";
import { AccessDeniedError } from "@/modules/access";
import {
  AccountingRuleError,
  canEditChartOfAccounts,
  canViewChartOfAccounts,
  getJournalEntry,
  JOURNAL_STATUS_LABELS,
  listChartOfAccounts,
  sumAmounts,
  type JournalEntryDetail,
} from "@/modules/accounting";
import { deleteDraftAction } from "../actions";
import { JournalForm } from "../journal-form";

export default async function JournalPage({ params }: PageProps<"/[company]/jurnal/[id]">) {
  const { company: code, id } = await params;
  const { user, company } = await requireCompany(code);
  if (!canViewChartOfAccounts(user.grants, company.id) || !/^[0-9a-f-]{36}$/.test(id)) notFound();

  let entry: JournalEntryDetail;
  try {
    entry = await getJournalEntry(getDb(), user, id);
  } catch (error) {
    if (error instanceof AccessDeniedError || error instanceof AccountingRuleError) notFound();
    throw error;
  }
  if (entry.companyId !== company.id) notFound();

  const base = `/${company.code.toLowerCase()}/jurnal`;
  const breadcrumbs = [{ label: "Akuntansi" }, { label: "Jurnal", href: base }];

  if (entry.status === "draft" && canEditChartOfAccounts(user.grants, company.id)) {
    const accounts = (await listChartOfAccounts(getDb(), user, company.id)).filter((a) => a.isActive && !a.isHeader);
    // Keep Accounts the Draft already uses in the list, even if they can no longer be posted to;
    // Posting will name the problem.
    const used = entry.lines
      .filter((l) => !accounts.some((a) => a.id === l.accountId))
      .map((l) => ({ id: l.accountId, code: l.accountCode, name: `${l.accountName} (tidak bisa diposting)` }));
    return (
      <>
        <PageHeader
          breadcrumbs={breadcrumbs}
          title="Draf jurnal"
          description={`Dibuat oleh ${entry.createdByName ?? "–"}. Belum bernomor sampai diposting.`}
          actions={
            <ConfirmAction
              title="Hapus draf ini?"
              description="Draf jurnal dihapus permanen. Jurnal yang sudah diposting tidak terpengaruh."
              confirmLabel="Hapus draf"
              destructive
              action={deleteDraftAction}
              fields={{ entryId: entry.id, companyCode: company.code }}
              trigger={
                <Button variant="outline">
                  <Trash2Icon /> Hapus draf
                </Button>
              }
            />
          }
        />
        <JournalForm
          company={{ id: company.id, code: company.code }}
          accounts={[...accounts.map((a) => ({ id: a.id, code: a.code, name: a.name })), ...used]}
          cancelHref={base}
          initial={{
            entryId: entry.id,
            date: entry.date,
            description: entry.description,
            lines: entry.lines.map((l) => ({
              accountId: l.accountId,
              debit: money(l.debit).isZero() ? "" : l.debit,
              credit: money(l.credit).isZero() ? "" : l.credit,
              description: l.description ?? "",
            })),
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={entry.documentNumber ?? "Draf jurnal"}
        description={entry.description}
        actions={<Badge variant={entry.status === "posted" ? "success" : "secondary"}>{JOURNAL_STATUS_LABELS[entry.status]}</Badge>}
      />
      <JournalDetail entry={entry} />
    </>
  );
}

function JournalDetail({ entry }: { entry: JournalEntryDetail }) {
  const facts: [string, string][] = [
    ["Tanggal", formatIsoDate(entry.date)],
    ["Dibuat oleh", entry.createdByName ?? "–"],
    ...(entry.postedAt ? ([["Diposting", `${formatDateTime(entry.postedAt)} oleh ${entry.postedByName ?? "–"}`]] as [string, string][]) : []),
  ];
  return (
    <div className="space-y-6">
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Kode</TableHead>
              <TableHead>Akun</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-44 text-right">Debit</TableHead>
              <TableHead className="w-44 text-right">Kredit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono">{l.accountCode}</TableCell>
                <TableCell>{l.accountName}</TableCell>
                <TableCell className="text-muted-foreground">{l.description}</TableCell>
                <TableCell className="numeric text-right">{money(l.debit).isZero() ? "" : formatRupiah(money(l.debit))}</TableCell>
                <TableCell className="numeric text-right">{money(l.credit).isZero() ? "" : formatRupiah(money(l.credit))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-medium">
                Total
              </TableCell>
              <TableCell className="numeric text-right font-medium">{formatRupiah(sumAmounts(entry.lines.map((l) => l.debit)))}</TableCell>
              <TableCell className="numeric text-right font-medium">{formatRupiah(sumAmounts(entry.lines.map((l) => l.credit)))}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
