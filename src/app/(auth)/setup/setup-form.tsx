"use client";

import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/modules/access/rules";
import { setupOwner } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwner, {});
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nama</FieldLabel>
          <Input id="name" name="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" required />
          <FieldDescription>Harus sama dengan BOOTSTRAP_OWNER_EMAIL di server.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
          <FieldDescription>Minimal {MIN_PASSWORD_LENGTH} karakter.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">Ulangi kata sandi</FieldLabel>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <FormError message={state.error} />
        <Button type="submit" disabled={pending} className="w-full">
          Buat akun Pemilik
        </Button>
      </FieldGroup>
    </form>
  );
}
