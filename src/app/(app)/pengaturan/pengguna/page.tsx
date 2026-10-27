import { getDb } from "@/db/client";
import { requireAdministrator } from "@/lib/session";
import { listParams } from "@/lib/list-params";
import { listAccessibleCompanies, listUsers } from "@/modules/access";
import { CreateUserDialog } from "./create-user-dialog";
import { UsersTable } from "./users-table";

const SORTS = ["name", "-name", "email", "-email"] as const;

export default async function UsersPage({ searchParams }: PageProps<"/pengaturan/pengguna">) {
  const actor = await requireAdministrator();
  const db = getDb();
  const [list, companies] = await Promise.all([
    listUsers(db, actor, listParams(await searchParams, SORTS)),
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
