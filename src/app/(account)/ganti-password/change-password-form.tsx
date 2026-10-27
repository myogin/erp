"use client";

import { useActionState, useEffect } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/modules/access/rules";
import { changePassword } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  useEffect(() => {
    // A full page load, not router.push: the client router still holds "/" as a
    // redirect back here from before the change, and would replay it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
    if (state.done) window.location.assign("/");
  }, [state.done]);

  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">Kata sandi saat ini (atau sementara)</FieldLabel>
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">Kata sandi baru</FieldLabel>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
          <FieldDescription>Minimal {MIN_PASSWORD_LENGTH} karakter.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">Ulangi kata sandi baru</FieldLabel>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <FormError message={state.error} />
        <Button type="submit" disabled={pending || state.done} className="w-full">
          Simpan
        </Button>
      </FieldGroup>
    </form>
  );
}
