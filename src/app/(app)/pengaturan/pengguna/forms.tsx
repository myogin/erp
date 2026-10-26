"use client";

import { useActionState, useState } from "react";
import { Button, Field, FormMessage, Input, OneTimeSecret, Select } from "@/components/ui";
import { isGlobalRole, ROLE_LABELS, ROLES, type Role } from "@/modules/access/roles";
import { createUserAction, grantRoleAction, resetPasswordAction, revokeRoleAction } from "../actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Nama">
        <Input name="name" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <Button type="submit" disabled={pending}>
        Buat pengguna
      </Button>
      <FormMessage state={state} />
      {state.secret && <OneTimeSecret label="Kata sandi sementara" value={state.secret} />}
    </form>
  );
}

export function GrantRoleForm({
  users,
  companies,
}: {
  users: { id: string; name: string }[];
  companies: { id: string; code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(grantRoleAction, {});
  const [role, setRole] = useState<Role>("finance");
  return (
    <form action={action} className="space-y-3">
      <Field label="Pengguna">
        <Select name="userId" required>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Peran">
        <Select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
              {isGlobalRole(r) ? " (semua perusahaan)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      {!isGlobalRole(role) && (
        <Field label="Perusahaan">
          <Select name="companyId" required>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button type="submit" disabled={pending}>
        Beri peran
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function RevokeRoleButton({ grantId }: { grantId: string }) {
  const [state, action, pending] = useActionState(revokeRoleAction, {});
  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="grantId" value={grantId} />
      <Button type="submit" variant="danger" disabled={pending} aria-label="Cabut peran" className="px-1 py-0">
        ×
      </Button>
      {state.error && <span className="text-xs text-red-700 dark:text-red-400">{state.error}</span>}
    </form>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        Reset kata sandi
      </Button>
      {state.error && <p className="text-xs text-red-700 dark:text-red-400">{state.error}</p>}
      {state.secret && <OneTimeSecret label="Kata sandi sementara" value={state.secret} />}
    </form>
  );
}
