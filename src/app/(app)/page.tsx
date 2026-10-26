import { getDb } from "@/db/client";
import { requireUser } from "@/lib/session";
import { listAccessibleCompanies, ROLE_LABELS } from "@/modules/access";

export default async function HomePage() {
  const user = await requireUser();
  const companies = await listAccessibleCompanies(getDb(), user);
  const globalRoles = user.grants.filter((g) => g.companyId === null).map((g) => ROLE_LABELS[g.role]);

  return (
    <>
      <h1 className="text-xl font-semibold">Selamat datang, {user.name}</h1>
      {globalRoles.length > 0 && <p className="text-sm">Peran: {globalRoles.join(", ")} (semua perusahaan)</p>}
      <section>
        <h2 className="mb-2 font-semibold">Perusahaan</h2>
        {companies.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Belum ada perusahaan yang dapat Anda akses.</p>
        ) : (
          <ul className="space-y-2">
            {companies.map((c) => {
              const roles = user.grants.filter((g) => g.companyId === c.id).map((g) => ROLE_LABELS[g.role]);
              return (
                <li key={c.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <span className="font-mono text-sm">{c.code}</span> · {c.name}
                  {roles.length > 0 && <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">({roles.join(", ")})</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
