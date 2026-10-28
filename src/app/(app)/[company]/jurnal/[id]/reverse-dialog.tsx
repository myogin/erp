"use client";

import { Undo2Icon } from "lucide-react";
import { useActionState, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { reverseEntryAction } from "../actions";

/** "Buat jurnal balik": a short form, so a dialog (docs/ui.md). On success the action opens the new Reversal. */
export function ReverseDialog({ entry, companyCode, today }: { entry: { id: string; documentNumber: string }; companyCode: string; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Undo2Icon /> Buat jurnal balik
        </Button>
      </DialogTrigger>
      <DialogContent>{open && <ReverseForm entry={entry} companyCode={companyCode} today={today} close={() => setOpen(false)} />}</DialogContent>
    </Dialog>
  );
}

function ReverseForm({
  entry,
  companyCode,
  today,
  close,
}: {
  entry: { id: string; documentNumber: string };
  companyCode: string;
  today: string;
  close: () => void;
}) {
  const [state, action, pending] = useActionState(reverseEntryAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="entryId" value={entry.id} />
      <input type="hidden" name="companyCode" value={companyCode} />
      <DialogHeader>
        <DialogTitle>Buat jurnal balik</DialogTitle>
        <DialogDescription>
          Membuat jurnal baru yang membalik setiap baris <span className="font-mono">{entry.documentNumber}</span> dan langsung
          memostingnya. Jurnal balik tidak bisa diubah atau dibalik lagi.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-6">
        <Field>
          <FieldLabel htmlFor="reversal-date">Tanggal</FieldLabel>
          <DatePicker id="reversal-date" name="date" defaultValue={today} required />
          <FieldDescription>Harus di bulan yang belum ditutup.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="reversal-reason">Alasan</FieldLabel>
          <Textarea id="reversal-reason" name="reason" required rows={2} placeholder="mis. Salah akun" />
        </Field>
      </FieldGroup>
      <FormError message={state.error} />
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          Posting jurnal balik
        </Button>
      </DialogFooter>
    </form>
  );
}
