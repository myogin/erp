import { AuthCard } from "@/components/auth-card";
import { VerifyForm } from "./verify-form";

export default function VerifyPage() {
  return (
    <AuthCard title="Verifikasi 2 langkah" description="Masukkan kode dari aplikasi authenticator di ponsel Anda.">
      <VerifyForm />
    </AuthCard>
  );
}
