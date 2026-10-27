"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { useToastAction } from "@/components/use-toast-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createCompanyAction } from "../actions";

export function CreateCompanyDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Tambah perusahaan
        </Button>
      </DialogTrigger>
      <DialogContent>{open && <CreateCompanyForm close={() => setOpen(false)} />}</DialogContent>
    </Dialog>
  );
}

function CreateCompanyForm({ close }: { close: () => void }) {
  const [state, action, pending] = useToastAction(createCompanyAction, close);
  return (
    <form action={action}>
      <DialogHeader>
        <DialogTitle>Tambah perusahaan</DialogTitle>
        <DialogDescription>Kode tidak bisa diubah setelah dipakai di dokumen, jadi pilih dengan hati-hati.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-6">
        <Field>
          <FieldLabel htmlFor="company-code">Kode</FieldLabel>
          <Input id="company-code" name="code" required maxLength={10} className="font-mono uppercase" autoFocus />
          <FieldDescription>2–10 huruf/angka, mis. CVA. Muncul di alamat halaman (/cva) dan nomor dokumen.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="company-name">Nama</FieldLabel>
          <Input id="company-name" name="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="company-npwp">NPWP (opsional)</FieldLabel>
          <Input id="company-npwp" name="npwp" />
        </Field>
      </FieldGroup>
      <FormError message={state.error} />
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}
