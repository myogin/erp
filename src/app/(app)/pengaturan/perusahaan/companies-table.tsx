"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";

type CompanyRow = { id: string; code: string; name: string; npwp: string | null };

// Module level so cell components keep their identity across renders (see DataTable).
const columns: ColumnDef<CompanyRow>[] = [
  {
    accessorKey: "code",
    header: "Kode",
    enableSorting: true,
    meta: { className: "w-32" },
    cell: ({ row }) => (
      <Link href={`/${row.original.code.toLowerCase()}`} className="font-mono font-medium hover:underline">
        {row.original.code}
      </Link>
    ),
  },
  { accessorKey: "name", header: "Nama", enableSorting: true },
  { accessorKey: "npwp", header: "NPWP", cell: ({ row }) => row.original.npwp ?? <span className="text-muted-foreground">–</span> },
];

export function CompaniesTable({
  rows,
  total,
  page,
  pageSize,
  emptyAction,
}: {
  rows: CompanyRow[];
  total: number;
  page: number;
  pageSize: number;
  emptyAction?: ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      searchPlaceholder="Cari kode, nama, atau NPWP…"
      emptyMessage="Belum ada perusahaan."
      emptyAction={emptyAction}
    />
  );
}
