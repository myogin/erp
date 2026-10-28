"use client";

import { ArchiveIcon, ArchiveRestoreIcon, DownloadIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon, SearchXIcon } from "lucide-react";
import { useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPES, type AccountType } from "@/modules/accounting/rules";
import { AddSubAccountDialog, RenameAccountDialog } from "./account-dialogs";
import { setAccountActiveAction } from "./actions";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  depth: number;
  isHeader: boolean;
  isActive: boolean;
  fromTemplate: boolean;
};

/**
 * The whole Chart of Accounts as one tree. Unlike other tables (docs/ui.md) it
 * isn't paged on the server: a tree split across pages loses its context, and
 * a Chart of Accounts stays at a couple of hundred rows. Search filters in the browser.
 */
export function AccountsTable({
  companyId,
  rows,
  canEdit,
  exportHref,
}: {
  companyId: string;
  rows: AccountRow[];
  canEdit: boolean;
  exportHref: string;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const shown = term ? rows.filter((r) => r.code.includes(term) || r.name.toLowerCase().includes(term)) : rows;
  const codes = rows.map((r) => r.code);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-48 flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode atau nama akun…" className="pl-8" aria-label="Cari" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={exportHref}>
              <DownloadIcon /> Ekspor Excel
            </a>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="w-56">Jenis</TableHead>
              <TableHead className="w-40">Keterangan</TableHead>
              {canEdit && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={canEdit ? 5 : 4} className="h-auto py-12">
                  <EmptyState icon={<SearchXIcon />} title={`Tidak ada hasil untuk “${search.trim()}”`}>
                    <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                      Hapus pencarian
                    </Button>
                  </EmptyState>
                </TableCell>
              </TableRow>
            ) : (
              shown.map((account) => (
                <TableRow key={account.id} className={cn(!account.isActive && "text-muted-foreground")}>
                  <TableCell>
                    {/* Indented by depth; skipped while searching, when rows lose their parents. */}
                    <span className="font-mono" style={{ paddingLeft: term ? 0 : `${account.depth * 1.25}rem` }}>
                      {account.code}
                    </span>
                  </TableCell>
                  <TableCell className={cn(account.isHeader && "font-medium")}>{account.name}</TableCell>
                  <TableCell>{ACCOUNT_TYPES[account.type]}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {account.isHeader && <Badge variant="outline">Induk</Badge>}
                      {!account.fromTemplate && <Badge variant="info">Sub-akun</Badge>}
                      {!account.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                    </div>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <RowActions companyId={companyId} account={account} takenCodes={codes} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {term ? `${shown.length} dari ${rows.length} akun` : `${rows.length} akun`}
      </p>
    </div>
  );
}

function RowActions({ companyId, account, takenCodes }: { companyId: string; account: AccountRow; takenCodes: string[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [activeOpen, setActiveOpen] = useState(false);
  const isSubAccount = !account.fromTemplate;
  if (!account.isActive && !isSubAccount) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${account.code} ${account.name}`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {account.isActive && (
            <DropdownMenuItem onSelect={() => setAddOpen(true)}>
              <PlusIcon /> Tambah sub-akun
            </DropdownMenuItem>
          )}
          {isSubAccount && (
            <>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <PencilIcon /> Ganti nama
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActiveOpen(true)}>
                {account.isActive ? (
                  <>
                    <ArchiveIcon /> Nonaktifkan
                  </>
                ) : (
                  <>
                    <ArchiveRestoreIcon /> Aktifkan
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AddSubAccountDialog companyId={companyId} parent={account} takenCodes={takenCodes} open={addOpen} onOpenChange={setAddOpen} />
      {isSubAccount && (
        <>
          <RenameAccountDialog account={account} open={renameOpen} onOpenChange={setRenameOpen} />
          <ConfirmAction
            open={activeOpen}
            onOpenChange={setActiveOpen}
            title={`${account.isActive ? "Nonaktifkan" : "Aktifkan"} ${account.code} ${account.name}?`}
            description={
              account.isActive
                ? "Akun tidak muncul lagi di pilihan saat mencatat transaksi, tetapi tetap ada di laporan. Bisa diaktifkan kembali."
                : "Akun muncul kembali di pilihan saat mencatat transaksi."
            }
            confirmLabel={account.isActive ? "Nonaktifkan" : "Aktifkan"}
            action={setAccountActiveAction}
            fields={{ accountId: account.id, active: String(!account.isActive) }}
          />
        </>
      )}
    </>
  );
}
