"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DownloadIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah, money } from "@/lib/money";
import { formatIsoDate } from "@/lib/time";
import { JOURNAL_STATUS_LABELS, type JournalStatus } from "@/modules/accounting/rules";

type JournalRow = { id: string; status: JournalStatus; date: string; description: string; documentNumber: string | null; total: string };
type TableMeta = { base: string };

// Module level so cell components keep their identity across renders (see DataTable).
const columns: ColumnDef<JournalRow>[] = [
  {
    id: "number",
    header: "Nomor",
    meta: { className: "w-56" },
    cell: ({ row, table }) => (
      <Link href={`${(table.options.meta as TableMeta).base}/${row.original.id}`} className="font-mono font-medium hover:underline">
        {row.original.documentNumber ?? <span className="font-sans text-muted-foreground">Belum bernomor</span>}
      </Link>
    ),
  },
  { id: "date", header: "Tanggal", meta: { className: "w-32" }, cell: ({ row }) => formatIsoDate(row.original.date) },
  { accessorKey: "description", header: "Keterangan" },
  {
    id: "total",
    header: () => <div className="text-right">Total</div>,
    meta: { className: "w-44" },
    cell: ({ row }) => <div className="numeric text-right">{formatRupiah(money(row.original.total))}</div>,
  },
  {
    id: "status",
    header: "Status",
    meta: { className: "w-32" },
    cell: ({ row }) => (
      <Badge variant={row.original.status === "posted" ? "success" : "secondary"}>{JOURNAL_STATUS_LABELS[row.original.status]}</Badge>
    ),
  },
];

export function JournalTable({
  rows,
  total,
  page,
  pageSize,
  base,
  showStatusFilter,
  emptyAction,
}: {
  rows: JournalRow[];
  total: number;
  page: number;
  pageSize: number;
  base: string;
  showStatusFilter: boolean;
  emptyAction?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const exportQuery = new URLSearchParams();
  for (const key of ["q", "status"]) {
    const value = searchParams.get(key);
    if (value) exportQuery.set(key, value);
  }
  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      meta={{ base } satisfies TableMeta}
      searchPlaceholder="Cari nomor atau keterangan…"
      emptyMessage="Belum ada jurnal."
      emptyAction={emptyAction}
      toolbar={
        <>
          {showStatusFilter && <StatusFilter />}
          <Button variant="outline" asChild>
            <a href={`${base}/ekspor${exportQuery.size ? `?${exportQuery}` : ""}`}>
              <DownloadIcon /> Ekspor Excel
            </a>
          </Button>
        </>
      }
    />
  );
}

const FILTERS: { value: JournalStatus | null; label: string }[] = [
  { value: null, label: "Semua" },
  { value: "draft", label: "Draf" },
  { value: "posted", label: "Diposting" },
];

/** Status filter kept in the URL (`status`), like the table's search and page. */
function StatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status");
  return (
    <div className="flex rounded-lg border bg-card p-0.5" role="group" aria-label="Filter status">
      {FILTERS.map((f) => (
        <Button
          key={f.label}
          type="button"
          size="sm"
          variant={current === f.value ? "secondary" : "ghost"}
          aria-pressed={current === f.value}
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            if (f.value) params.set("status", f.value);
            else params.delete("status");
            params.delete("page");
            router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
          }}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
