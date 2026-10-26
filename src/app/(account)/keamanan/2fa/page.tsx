import Link from "next/link";
import { Suspense } from "react";
import { requireSignedIn } from "@/lib/session";
import { requiresTwoFactor } from "@/modules/access";
import { TwoFactorSetup } from "./two-factor-setup";

export default function TwoFactorPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Verifikasi 2 langkah (2FA)</h1>
      <Suspense fallback={<p>Memuat…</p>}>
        <TwoFactorStatus />
      </Suspense>
    </>
  );
}

async function TwoFactorStatus() {
  const user = await requireSignedIn();
  if (user.twoFactorEnabled) {
    return (
      <p className="text-sm">
        2FA sudah aktif. <Link href="/" className="underline">Kembali ke beranda</Link>
      </p>
    );
  }
  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {requiresTwoFactor(user.grants)
          ? "Peran Anda dapat melihat data gaji, jadi 2FA wajib diaktifkan sebelum melanjutkan."
          : "Lindungi akun Anda dengan aplikasi authenticator."}
      </p>
      <TwoFactorSetup />
    </>
  );
}
