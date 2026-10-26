import { Card } from "@/components/ui";
import { getDb } from "@/db/client";
import { requireAdministrator } from "@/lib/session";
import { listAccessibleCompanies, listUsers, ROLE_LABELS } from "@/modules/access";
import { CreateUserForm, GrantRoleForm, ResetPasswordButton, RevokeRoleButton } from "./forms";

export default async function UsersPage() {
  const actor = await requireAdministrator();
  const db = getDb();
  const [users, companies] = await Promise.all([listUsers(db, actor), listAccessibleCompanies(db, actor)]);

  return (
    <>
      <h1 className="text-xl font-semibold">Pengguna</h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Nama</th>
            <th>Email</th>
            <th>Peran</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-zinc-100 align-top dark:border-zinc-900">
              <td className="py-2">{u.name}</td>
              <td>{u.email}</td>
              <td>
                <ul className="space-y-1">
                  {u.grants.map((g) => (
                    <li key={g.id} className="flex items-center gap-1">
                      {ROLE_LABELS[g.role]}
                      {g.companyCode ? ` · ${g.companyCode}` : " · semua"}
                      <RevokeRoleButton grantId={g.id} />
                    </li>
                  ))}
                </ul>
              </td>
              <td className="text-xs">
                {u.mustChangePassword && <span className="block">Kata sandi sementara</span>}
                <span className="block">{u.twoFactorEnabled ? "2FA aktif" : "2FA belum aktif"}</span>
              </td>
              <td>{u.id !== actor.userId && <ResetPasswordButton userId={u.id} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Tambah pengguna">
          <CreateUserForm />
        </Card>
        <Card title="Beri peran">
          <GrantRoleForm
            users={users.map((u) => ({ id: u.id, name: u.name }))}
            companies={companies.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
          />
        </Card>
      </div>
    </>
  );
}
