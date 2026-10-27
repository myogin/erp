import { getDb } from "@/db/client";
import { actionsMatchingLabel } from "@/lib/audit-labels";
import { listParams } from "@/lib/list-params";
import { requireAdministrator } from "@/lib/session";
import { listAuditLog } from "@/modules/access";
import { AuditTable } from "./audit-table";

export default async function AuditPage({ searchParams }: PageProps<"/pengaturan/audit">) {
  const actor = await requireAdministrator();
  const params = listParams(await searchParams);
  const list = await listAuditLog(getDb(), actor, { ...params, matchingActions: actionsMatchingLabel(params.search) });
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Catatan tindakan penting, terbaru di atas. Tidak bisa diubah atau dihapus. Waktu dalam WITA.</p>
      </div>
      <AuditTable rows={list.rows} total={list.total} page={list.page} pageSize={list.pageSize} />
    </>
  );
}
