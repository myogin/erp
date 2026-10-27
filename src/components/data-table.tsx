"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, InboxIcon, SearchIcon, SearchXIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props<T> = {
  /**
   * Define columns at module level, never inside a component: TanStack renders
   * `cell` as a component, so a new function each render remounts every cell
   * (and closes any dialog open in a row). Pass per-render data through `meta`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack's ColumnDef needs `any` for mixed value types
  columns: ColumnDef<T, any>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  searchPlaceholder?: string;
  /** Extra controls next to the search box, e.g. an export button. */
  toolbar?: ReactNode;
  /** Shown when the list has no rows at all; a search with no hits gets its own message. */
  emptyMessage?: string;
  /** Next step under the empty message, e.g. the page's "Tambah …" button. */
  emptyAction?: ReactNode;
  /** Data the column definitions need, read in cells as `table.options.meta`. */
  meta?: Record<string, unknown>;
};

/**
 * A table whose search, sort and page live in the URL (`q`, `sort`, `page`)
 * and are applied by the server (docs/ui.md). Mark columns sortable with
 * `accessorKey` plus `enableSorting: true`; the key is sent as the sort param.
 */
export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  searchPlaceholder = "Cari…",
  toolbar,
  emptyMessage = "Belum ada data.",
  emptyAction,
  meta,
}: Props<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function navigate(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  const sortParam = searchParams.get("sort");
  const sorting: SortingState = sortParam ? [{ id: sortParam.replace(/^-/, ""), desc: sortParam.startsWith("-") }] : [];

  // TanStack Table isn't compatible with React Compiler memoisation; the compiler skips this component, which is fine.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: true,
    rowCount: total,
    state: { sorting, pagination: { pageIndex: page - 1, pageSize } },
    defaultColumn: { enableSorting: false },
    meta,
    onSortingChange: (updater: Updater<SortingState>) => {
      const [next] = typeof updater === "function" ? updater(sorting) : updater;
      navigate({ sort: next ? `${next.desc ? "-" : ""}${next.id}` : null, page: null });
    },
  });

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  useEffect(() => {
    if (search === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => navigate({ q: search || null, page: null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [search]);

  const appliedSearch = searchParams.get("q");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-48 flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} className="pl-8" aria-label="Cari" />
        </div>
        <div className="ml-auto flex items-center gap-2">{toolbar}</div>
      </div>

      <div className={cn("overflow-hidden rounded-lg border bg-card transition-opacity", pending && "opacity-60")} aria-busy={pending}>
        {/* Scrolls inside its own box so the sticky header stays visible on long pages. */}
        <Table containerClassName="max-h-[max(24rem,calc(100svh-16rem))] overflow-y-auto">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const label = flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                      {header.column.getCanSort() ? (
                        <Button variant="ghost" size="xs" className="-mx-2 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={header.column.getToggleSortingHandler()}>
                          {label}
                          {sorted === "asc" ? <ArrowUpIcon /> : sorted === "desc" ? <ArrowDownIcon /> : <ArrowUpDownIcon className="opacity-40" />}
                        </Button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-auto py-12">
                  {appliedSearch ? (
                    <EmptyState icon={<SearchXIcon />} title={`Tidak ada hasil untuk “${appliedSearch}”`}>
                      <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                        Hapus pencarian
                      </Button>
                    </EmptyState>
                  ) : (
                    <EmptyState icon={<InboxIcon />} title={emptyMessage}>
                      {emptyAction}
                    </EmptyState>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Menampilkan {from}–{to} dari {total}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Halaman {page} dari {pageCount}
          </span>
          <Button variant="outline" size="icon-sm" aria-label="Halaman sebelumnya" disabled={page <= 1 || pending} onClick={() => navigate({ page: page - 1 > 1 ? String(page - 1) : null })}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Halaman berikutnya" disabled={page >= pageCount || pending} onClick={() => navigate({ page: String(page + 1) })}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center whitespace-normal">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5" aria-hidden>
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- generic params must match TanStack's declaration
  interface ColumnMeta<TData, TValue> {
    /** Classes for the column's header and cells, e.g. "numeric" for figures. */
    className?: string;
  }
}
