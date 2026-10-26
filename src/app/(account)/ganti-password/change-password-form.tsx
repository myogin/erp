"use client";

import { useActionState, useEffect } from "react";
import { Button, Field, FormMessage, Input } from "@/components/ui";
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
    <form action={action} className="space-y-3">
      <Field label="Kata sandi saat ini (atau sementara)">
        <Input name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Kata sandi baru (min. 10 karakter)">
        <Input name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Ulangi kata sandi baru">
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        Simpan
      </Button>
    </form>
  );
}
