"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
    <form action={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="code">{useBackupCode ? "Kode cadangan" : "Kode dari aplikasi authenticator"}</FieldLabel>
          <Input
            id="code"
            name="code"
            autoComplete="one-time-code"
            inputMode={useBackupCode ? "text" : "numeric"}
            required
            autoFocus
          />
        </Field>
        <FormError message={error} />
        <Button type="submit" disabled={pending} className="w-full">
          Verifikasi
        </Button>
        <Button type="button" variant="link" className="h-auto p-0" onClick={() => setUseBackupCode(!useBackupCode)}>
          {useBackupCode ? "Pakai kode authenticator" : "Ponsel hilang? Pakai kode cadangan"}
        </Button>
      </FieldGroup>
    </form>
  );
}
