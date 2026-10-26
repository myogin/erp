import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { requireUser } from "@/lib/session";
import { listAccessibleCompanies } from "@/modules/access";

/** Home without a Company: go to the first accessible one (ADR-0008). */
export default async function HomePage() {
  const user = await requireUser();
  const [first] = await listAccessibleCompanies(getDb(), user);
  if (first) redirect(`/${first.code.toLowerCase()}`);

  return (
    <div className="mx-auto mt-16 max-w-md space-y-3 text-center">
      <h1 className="text-xl font-semibold">Belum ada perusahaan</h1>
      {user.isAdministrator ? (
        <>
          <p className="text-sm text-muted-foreground">Tambahkan perusahaan (CV) pertama untuk mulai.</p>
          <Button asChild>
            <Link href="/pengaturan/perusahaan">Tambah perusahaan</Link>
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Anda belum diberi akses ke perusahaan mana pun. Hubungi Admin.</p>
      )}
    </div>
  );
}
