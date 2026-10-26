"use client";

import { useState } from "react";
import { useToastAction } from "@/components/use-toast-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isGlobalRole, isOwnerManagedRole, ROLE_LABELS, ROLES, type Role } from "@/modules/access/roles";
import { grantRoleAction } from "../actions";

type Props = {
  user: { id: string; name: string };
  companies: { id: string; code: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GrantRoleDialog({ user, companies, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <GrantRoleForm user={user} companies={companies} close={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function GrantRoleForm({ user, companies, close }: Omit<Props, "open" | "onOpenChange"> & { close: () => void }) {
  const [, action, pending] = useToastAction(grantRoleAction, close);
  const [role, setRole] = useState<Role>("finance");

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={user.id} />
      <DialogHeader>
        <DialogTitle>Beri peran</DialogTitle>
        <DialogDescription>{user.name}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="my-6">
        <Field>
          <FieldLabel>Peran</FieldLabel>
          <Select name="role" value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger aria-label="Peran">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                  {isGlobalRole(r) && " (semua perusahaan)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOwnerManagedRole(role) && <FieldDescription>Hanya Pemilik yang dapat memberi peran ini.</FieldDescription>}
        </Field>
        {!isGlobalRole(role) && (
          <Field>
            <FieldLabel>Perusahaan</FieldLabel>
            <Select name="companyId" defaultValue={companies[0]?.id} required>
              <SelectTrigger aria-label="Perusahaan">
                <SelectValue placeholder="Pilih perusahaan" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          Beri peran
        </Button>
      </DialogFooter>
    </form>
  );
}
