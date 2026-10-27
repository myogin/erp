import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb } from "@/db/client";
import { isSetupComplete } from "@/modules/access";
import { SetupForm } from "./setup-form";

export default function SetupPage() {
  return (
    <AuthCard title="Setup awal" description="Buat akun Pemilik pertama. Halaman ini nonaktif setelah dipakai.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <SetupGate />
      </Suspense>
    </AuthCard>
  );
}

async function SetupGate() {
  await connection(); // request time only; there's no database during `next build`
  if (await isSetupComplete(getDb())) redirect("/masuk");
  if (!process.env.BOOTSTRAP_OWNER_EMAIL) {
    return (
      <p className="text-sm">
        Isi variabel <code>BOOTSTRAP_OWNER_EMAIL</code> di server, lalu muat ulang halaman ini.
      </p>
    );
  }
  return <SetupForm />;
}
