"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DownloadIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { auditActionLabel, formatAuditDetails } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/time";

type AuditRow = {
  id: number;
  at: Date;
  action: string;
  actorName: string | null;
  companyCode: string | null;
  details: Record<string, unknown> | null;
};

const dash = <span className="text-muted-foreground">–</span>;

// Module level so cell components keep their identity across renders (see DataTable).
const columns: ColumnDef<AuditRow>[] = [
  { id: "at", header: "Waktu", meta: { className: "w-40 whitespace-nowrap" }, cell: ({ row }) => formatDateTime(row.original.at) },
  { id: "actor", header: "Pelaku", cell: ({ row }) => row.original.actorName ?? dash },
  { id: "action", header: "Tindakan", cell: ({ row }) => auditActionLabel(row.original.action) },
  { id: "company", header: "Perusahaan", cell: ({ row }) => (row.original.companyCode ? <span className="font-mono">{row.original.companyCode}</span> : dash) },
  {
    id: "details",
    header: "Detail",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatAuditDetails(row.original.details)}</span>,
  },
];

export function AuditTable({ rows, total, page, pageSize }: { rows: AuditRow[]; total: number; page: number; pageSize: number }) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      searchPlaceholder="Cari tindakan, pelaku, atau kode CV…"
      emptyMessage="Belum ada entri."
      toolbar={
        <Button variant="outline" asChild>
          <a href={`/pengaturan/audit/ekspor${q ? `?q=${encodeURIComponent(q)}` : ""}`}>
            <DownloadIcon /> Ekspor Excel
          </a>
        </Button>
      }
    />
  );
}
