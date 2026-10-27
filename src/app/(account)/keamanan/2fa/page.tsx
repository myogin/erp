import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSignedIn } from "@/lib/session";
import { requiresTwoFactor } from "@/modules/access";
import { TwoFactorSetup } from "./two-factor-setup";

export default function TwoFactorPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <TwoFactorStatus />
    </Suspense>
  );
}

async function TwoFactorStatus() {
  const user = await requireSignedIn();
  if (user.twoFactorEnabled) {
    return (
      <AuthCard title="Verifikasi 2 langkah" description="2FA sudah aktif di akun Anda.">
        <Button asChild className="w-full">
          <Link href="/">Kembali ke beranda</Link>
        </Button>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Aktifkan verifikasi 2 langkah"
      description={
        requiresTwoFactor(user.grants)
          ? "Peran Anda dapat melihat data gaji, jadi 2FA wajib diaktifkan sebelum melanjutkan."
          : "Lindungi akun Anda dengan aplikasi authenticator."
      }
    >
      <TwoFactorSetup />
    </AuthCard>
  );
}
