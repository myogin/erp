"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage, Input } from "@/components/legacy-ui";
import { createCompanyAction } from "../actions";

export function CreateCompanyForm() {
  const [state, action, pending] = useActionState(createCompanyAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <Field label="Kode (mis. CVA)">
        <Input name="code" required maxLength={10} />
      </Field>
      <Field label="Nama">
        <Input name="name" required />
      </Field>
      <Field label="NPWP (opsional)">
        <Input name="npwp" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending}>
          Simpan
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
