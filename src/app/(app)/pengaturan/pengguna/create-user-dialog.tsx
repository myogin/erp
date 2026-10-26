"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { OneTimeSecret } from "@/components/one-time-secret";
import { useToastAction } from "@/components/use-toast-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createUserAction } from "../actions";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRound((r) => r + 1);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Tambah pengguna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <CreateUserForm key={round} close={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateUserForm({ close }: { close: () => void }) {
  const [state, action, pending] = useToastAction(createUserAction);

  if (state.secret) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Pengguna dibuat</DialogTitle>
          <DialogDescription>Pengguna wajib mengganti kata sandi ini saat pertama masuk. Beri perannya lewat menu di tabel.</DialogDescription>
        </DialogHeader>
        <OneTimeSecret label="Kata sandi sementara" value={state.secret} />
        <DialogFooter>
          <Button onClick={close}>Selesai</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form action={action}>
      <DialogHeader>
        <DialogTitle>Tambah pengguna</DialogTitle>
        <DialogDescription>Kata sandi sementara akan dibuat otomatis dan ditampilkan sekali.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-6">
        <Field>
          <FieldLabel htmlFor="user-name">Nama</FieldLabel>
          <Input id="user-name" name="name" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="user-email">Email</FieldLabel>
          <Input id="user-email" name="email" type="email" required />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          Buat pengguna
        </Button>
      </DialogFooter>
    </form>
  );
}
