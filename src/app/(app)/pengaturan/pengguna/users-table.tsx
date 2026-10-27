"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DownloadIcon, KeyRoundIcon, MoreHorizontalIcon, UserPlusIcon, XIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type Role } from "@/modules/access/roles";
import { resetPasswordAction, revokeRoleAction } from "../actions";
import { GrantRoleDialog } from "./grant-role-dialog";

type UserRow = {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean | null;
  mustChangePassword: boolean;
  grants: { id: string; role: Role; companyCode: string | null }[];
};
type CompanyOption = { id: string; code: string; name: string };

type Props = {
  rows: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  currentUserId: string;
  companies: CompanyOption[];
};

type TableMeta = { companies: CompanyOption[]; currentUserId: string };

// Module level so cell components keep their identity across renders (see DataTable).
const columns: ColumnDef<UserRow>[] = [
  {
    // Sortable columns need an accessor; its key is the server's sort key.
    accessorKey: "name",
    header: "Nama",
    enableSorting: true,
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.email}</div>
      </div>
    ),
  },
  {
    id: "grants",
    header: "Peran",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.grants.length === 0 && <span className="text-xs text-muted-foreground">Belum ada peran</span>}
        {row.original.grants.map((g) => {
          const label = `${ROLE_LABELS[g.role]} · ${g.companyCode ?? "semua"}`;
          return (
            <Badge key={g.id} variant="secondary" className="gap-1 pr-1">
              {label}
              <ConfirmAction
                title="Cabut peran?"
                description={`${row.original.name} tidak lagi memiliki peran ${label}.`}
                confirmLabel="Cabut peran"
                destructive
                action={revokeRoleAction}
                fields={{ grantId: g.id }}
                trigger={
                  <button type="button" aria-label={`Cabut ${label}`} className="rounded-sm p-0.5 hover:bg-background">
                    <XIcon className="size-3" />
                  </button>
                }
              />
            </Badge>
          );
        })}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.mustChangePassword && <Badge variant="outline">Kata sandi sementara</Badge>}
        <Badge variant={row.original.twoFactorEnabled ? "default" : "outline"}>{row.original.twoFactorEnabled ? "2FA aktif" : "Tanpa 2FA"}</Badge>
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    meta: { className: "w-12" },
    cell: ({ row, table }) => {
    const { companies, currentUserId } = table.options.meta as TableMeta;
    return <RowActions user={row.original} companies={companies} isSelf={row.original.id === currentUserId} />;
  },
  },
];

export function UsersTable({ rows, total, page, pageSize, currentUserId, companies }: Props) {
  const searchParams = useSearchParams();
  const exportQuery = searchParams.get("q") ? `?q=${encodeURIComponent(searchParams.get("q")!)}` : "";


  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      searchPlaceholder="Cari nama atau email…"
      emptyMessage="Belum ada pengguna."
      meta={{ companies, currentUserId } satisfies TableMeta}
      toolbar={
        <Button variant="outline" asChild>
          <a href={`/pengaturan/pengguna/ekspor${exportQuery}`}>
            <DownloadIcon /> Ekspor Excel
          </a>
        </Button>
      }
    />
  );
}

function RowActions({ user, companies, isSelf }: { user: UserRow; companies: CompanyOption[]; isSelf: boolean }) {
  const [grantOpen, setGrantOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${user.name}`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setGrantOpen(true)}>
            <UserPlusIcon /> Beri peran
          </DropdownMenuItem>
          {!isSelf && (
            <DropdownMenuItem onSelect={() => setResetOpen(true)}>
              <KeyRoundIcon /> Reset kata sandi
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <GrantRoleDialog user={user} companies={companies} open={grantOpen} onOpenChange={setGrantOpen} />
      <ConfirmAction
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={`Reset kata sandi ${user.name}?`}
        description="Kata sandi lama tidak berlaku lagi dan semua sesi pengguna ini diakhiri. Pengguna wajib membuat kata sandi baru saat masuk."
        confirmLabel="Reset kata sandi"
        destructive
        action={resetPasswordAction}
        fields={{ userId: user.id }}
        secretLabel="Kata sandi sementara"
      />
    </>
  );
}
