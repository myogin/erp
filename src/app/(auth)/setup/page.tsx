import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDb } from "@/db/client";
import { isSetupComplete } from "@/modules/access";
import { SetupForm } from "./setup-form";

export default function SetupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Setup awal</h1>
      <Suspense fallback={<p>Memuat…</p>}>
        <SetupGate />
      </Suspense>
    </>
  );
}

async function SetupGate() {
  if (await isSetupComplete(getDb())) redirect("/masuk");
  if (!process.env.BOOTSTRAP_OWNER_EMAIL) {
    return <p className="text-sm">Isi variabel <code>BOOTSTRAP_OWNER_EMAIL</code> di server, lalu muat ulang halaman ini.</p>;
  }
  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Buat akun Pemilik pertama. Halaman ini nonaktif setelah dipakai.
      </p>
      <SetupForm />
    </>
  );
}
