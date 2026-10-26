import { Suspense } from "react";
import { requireSignedIn } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Ganti kata sandi</h1>
      <Suspense fallback={<p>Memuat…</p>}>
        <Intro />
      </Suspense>
      <ChangePasswordForm />
    </>
  );
}

async function Intro() {
  const user = await requireSignedIn();
  return user.mustChangePassword ? (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      Anda masuk dengan kata sandi sementara. Buat kata sandi baru untuk melanjutkan.
    </p>
  ) : null;
}
