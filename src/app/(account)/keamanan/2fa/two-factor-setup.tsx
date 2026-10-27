"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { confirmTwoFactorEnabled } from "./actions";

type Enrollment = { qr: string; secret: string; backupCodes: string[] };

export function TwoFactorSetup() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function start(formData: FormData) {
    setPending(true);
    setError(undefined);
    const { data, error } = await authClient.twoFactor.enable({
      password: String(formData.get("password")),
      method: "totp",
    });
    setPending(false);
    if (error || data?.method !== "totp") {
      setError("Kata sandi salah.");
      return;
    }
    // The QR code is drawn in the browser, so the shared secret never leaves this page.
    const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
    setEnrollment({ qr: await QRCode.toDataURL(data.totpURI), secret, backupCodes: data.backupCodes });
  }

  async function verify(formData: FormData) {
    setPending(true);
    setError(undefined);
    const { error } = await authClient.twoFactor.verifyTotp({ code: String(formData.get("code")).trim() });
    if (error) {
      setPending(false);
      setError("Kode salah. Pastikan jam di ponsel sudah tepat.");
      return;
    }
    await confirmTwoFactorEnabled();
    router.push("/");
    router.refresh();
  }

  if (!enrollment) {
    return (
      <form action={start}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">Konfirmasi kata sandi</FieldLabel>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <FormError message={error} />
          <Button type="submit" disabled={pending} className="w-full">
            Mulai aktivasi
          </Button>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form action={verify}>
      <FieldGroup>
        <ol className="list-decimal space-y-4 pl-5 text-sm">
          <li>
            Pindai QR ini dengan Google Authenticator, Authy, atau sejenisnya.
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated locally */}
            <img src={enrollment.qr} alt="QR code 2FA" width={180} height={180} className="mt-2 rounded-md border bg-white p-2" />
            <span className="mt-1 block text-xs text-muted-foreground">
              Atau masukkan kode: <code className="select-all">{enrollment.secret}</code>
            </span>
          </li>
          <li>
            Simpan kode cadangan ini di tempat aman. Tiap kode hanya bisa dipakai sekali jika ponsel hilang.
            <ul className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-muted p-2 font-mono text-xs">
              {enrollment.backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </li>
          <li>Masukkan kode 6 digit dari aplikasi.</li>
        </ol>
        <Field>
          <FieldLabel htmlFor="code">Kode</FieldLabel>
          <Input id="code" name="code" autoComplete="one-time-code" inputMode="numeric" required />
        </Field>
        <FormError message={error} />
        <Button type="submit" disabled={pending} className="w-full">
          Aktifkan 2FA
        </Button>
      </FieldGroup>
    </form>
  );
}
