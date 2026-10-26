"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
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
    <form action={submit} className="space-y-3">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" defaultValue={email} required />
      </Field>
      <Field label="Kata sandi">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        Masuk
      </Button>
    </form>
  );
}
