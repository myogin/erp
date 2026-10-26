"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function VerifyForm() {
  const router = useRouter();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const code = String(formData.get("code")).trim();
    const { error } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Terlalu banyak percobaan. Coba lagi nanti." : "Kode salah atau kedaluwarsa.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-3">
      <Field label={useBackupCode ? "Kode cadangan" : "Kode dari aplikasi authenticator"}>
        <Input name="code" autoComplete="one-time-code" inputMode={useBackupCode ? "text" : "numeric"} required autoFocus />
      </Field>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        Verifikasi
      </Button>
      <button type="button" className="text-sm underline" onClick={() => setUseBackupCode(!useBackupCode)}>
        {useBackupCode ? "Pakai kode authenticator" : "Pakai kode cadangan"}
      </button>
    </form>
  );
}
