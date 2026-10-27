"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(undefined);
    // React resets the form after the action; keep the email so a retry only needs the password.
    setEmail(String(formData.get("email")));
    const { data, error } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Terlalu banyak percobaan. Coba lagi nanti." : "Email atau kata sandi salah.");
      return;
    }
    router.push(data && "twoFactorRedirect" in data && data.twoFactorRedirect ? "/masuk/verifikasi" : "/");
    router.refresh();
  }

  return (
    <form action={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormError message={error} />
        <Button type="submit" disabled={pending} className="w-full">
          Masuk
        </Button>
      </FieldGroup>
    </form>
  );
}
