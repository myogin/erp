"use client";

import { FormError } from "@/components/form-error";
import { useToastAction } from "@/components/use-toast-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { suggestSubAccountCode } from "@/modules/accounting/rules";
import { createSubAccountAction, renameAccountAction } from "./actions";

type Account = { id: string; code: string; name: string; isHeader: boolean };

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function AddSubAccountDialog({
  companyId,
  parent,
  takenCodes,
  open,
  onOpenChange,
}: DialogProps & { companyId: string; parent: Account; takenCodes: string[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <AddSubAccountForm companyId={companyId} parent={parent} takenCodes={takenCodes} close={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AddSubAccountForm({
  companyId,
  parent,
  takenCodes,
  close,
}: {
  companyId: string;
  parent: Account;
  takenCodes: string[];
  close: () => void;
}) {
  const [state, action, pending] = useToastAction(createSubAccountAction, close);
  const suggested = suggestSubAccountCode(parent.code, takenCodes);

  return (
    <form action={action}>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="parentCode" value={parent.code} />
      <DialogHeader>
        <DialogTitle>Tambah sub-akun</DialogTitle>
        <DialogDescription>
          Di bawah <span className="font-mono">{parent.code}</span> {parent.name}.
          {!parent.isHeader && " Akun ini akan menjadi akun induk dan tidak bisa lagi dipakai untuk mencatat transaksi."}
        </DialogDescription>
      </DialogHeader>
      {suggested ? (
        <FieldGroup className="my-6">
          <Field>
            <FieldLabel htmlFor="sub-account-code">Kode</FieldLabel>
            <Input id="sub-account-code" name="code" required defaultValue={suggested} inputMode="numeric" className="font-mono" />
            <FieldDescription>
              Kode induk ditambah 2 angka 50–99. Kode tidak bisa diubah setelah disimpan.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="sub-account-name">Nama</FieldLabel>
            <Input id="sub-account-name" name="name" required autoFocus />
          </Field>
        </FieldGroup>
      ) : (
        <p className="my-6 text-sm">Semua nomor 50–99 di bawah akun ini sudah terpakai.</p>
      )}
      <FormError message={state.error} />
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending || !suggested}>
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RenameAccountDialog({ account, open, onOpenChange }: DialogProps & { account: Account }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <RenameAccountForm account={account} close={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function RenameAccountForm({ account, close }: { account: Account; close: () => void }) {
  const [state, action, pending] = useToastAction(renameAccountAction, close);
  return (
    <form action={action}>
      <input type="hidden" name="accountId" value={account.id} />
      <DialogHeader>
        <DialogTitle>Ganti nama akun</DialogTitle>
        <DialogDescription>
          <span className="font-mono">{account.code}</span>. Kode tetap sama.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-6">
        <Field>
          <FieldLabel htmlFor="account-name">Nama</FieldLabel>
          <Input id="account-name" name="name" required defaultValue={account.name} autoFocus />
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
