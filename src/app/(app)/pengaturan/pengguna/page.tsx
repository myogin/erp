import { getDb } from "@/db/client";
import { requireAdministrator } from "@/lib/session";
import { listAccessibleCompanies, listUsers, type UserListQuery } from "@/modules/access";
import { CreateUserDialog } from "./create-user-dialog";
import { UsersTable } from "./users-table";

const SORTS = ["name", "-name", "email", "-email"] as const;
const PAGE_SIZE = 20;

export function parseUserQuery(params: Record<string, string | string[] | undefined>): UserListQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sort = one(params.sort);
  return {
    search: one(params.q),
    sort: SORTS.find((s) => s === sort),
    page: Number(one(params.page)) || 1,
    pageSize: PAGE_SIZE,
  };
}

export default async function UsersPage({ searchParams }: PageProps<"/pengaturan/pengguna">) {
  const actor = await requireAdministrator();
  const db = getDb();
  const [list, companies] = await Promise.all([
    listUsers(db, actor, parseUserQuery(await searchParams)),
    listAccessibleCompanies(db, actor),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pengguna</h1>
          <p className="text-sm text-muted-foreground">Akun yang bisa masuk ke ERP dan perannya.</p>
        </div>
        <CreateUserDialog />
      </div>
      <UsersTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        currentUserId={actor.userId}
        companies={companies.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
      />
    </>
  );
}
