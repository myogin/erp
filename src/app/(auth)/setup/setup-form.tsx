"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage, Input } from "@/components/legacy-ui";
import { setupOwner } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwner, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Nama">
        <Input name="name" required />
      </Field>
      <Field label="Email (harus sama dengan BOOTSTRAP_OWNER_EMAIL)">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Kata sandi (min. 10 karakter)">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Ulangi kata sandi">
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        Buat akun Pemilik
      </Button>
    </form>
  );
}
