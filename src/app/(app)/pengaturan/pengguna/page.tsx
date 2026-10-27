import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        breadcrumbs={[{ label: "Pengaturan" }]}
        title="Pengguna"
        description="Akun yang bisa masuk ke ERP dan perannya."
        actions={<CreateUserDialog />}
      />
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
