import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { requireSignedIn } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  return (
    <AuthCard
      title="Ganti kata sandi"
      description={
        <Suspense fallback={null}>
          <Intro />
        </Suspense>
      }
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}

async function Intro() {
  const user = await requireSignedIn();
  return user.mustChangePassword
    ? "Anda masuk dengan kata sandi sementara. Buat kata sandi baru untuk melanjutkan."
    : "Sesi di perangkat lain akan diakhiri setelah kata sandi diganti.";
}
