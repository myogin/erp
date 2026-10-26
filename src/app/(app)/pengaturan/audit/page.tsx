import { getDb } from "@/db/client";
import { requireAdministrator } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { listAuditLog } from "@/modules/access";

const ACTION_LABELS: Record<string, string> = {
  "setup.owner_created": "Setup awal: Pemilik dibuat",
  "company.create": "Perusahaan dibuat",
  "user.create": "Pengguna dibuat",
  "user.password_reset": "Kata sandi direset",
  "user.password_changed": "Kata sandi diganti",
  "user.two_factor_enabled": "2FA diaktifkan",
  "role.grant": "Peran diberikan",
  "role.revoke": "Peran dicabut",
};

export default async function AuditPage() {
  const actor = await requireAdministrator();
  const entries = await listAuditLog(getDb(), actor, { limit: 200 });
  return (
    <>
      <h1 className="text-xl font-semibold">Audit log</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">200 entri terakhir. Waktu dalam WITA.</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Waktu</th>
            <th>Pelaku</th>
            <th>Tindakan</th>
            <th>Perusahaan</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 whitespace-nowrap">{formatDateTime(e.at)}</td>
              <td>{e.actorName ?? "–"}</td>
              <td>{ACTION_LABELS[e.action] ?? e.action}</td>
              <td className="font-mono">{e.companyCode ?? "–"}</td>
              <td className="font-mono text-xs">{e.details ? JSON.stringify(e.details) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
