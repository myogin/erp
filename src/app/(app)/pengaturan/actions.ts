"use server";

import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { actionError, formString, type ActionState } from "@/lib/action-state";
import { requireAdministrator } from "@/lib/session";
import { createCompany, createUser, grantRole, resetPassword, revokeRole, type Role } from "@/modules/access";

export async function createCompanyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdministrator();
  try {
    const company = await createCompany(getDb(), actor, {
      code: formString(formData, "code"),
      name: formString(formData, "name"),
      npwp: formString(formData, "npwp"),
    });
    refresh();
    return { message: `Perusahaan ${company.code} dibuat.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function createUserAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdministrator();
  try {
    const { temporaryPassword } = await createUser(getDb(), actor, {
      name: formString(formData, "name"),
      email: formString(formData, "email"),
    });
    refresh();
    return { message: "Pengguna dibuat.", secret: temporaryPassword };
  } catch (error) {
    return actionError(error);
  }
}

export async function grantRoleAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdministrator();
  try {
    await grantRole(getDb(), actor, {
      userId: formString(formData, "userId"),
      role: formString(formData, "role") as Role,
      companyId: formString(formData, "companyId") || null,
    });
    refresh();
    return { message: "Peran diberikan." };
  } catch (error) {
    return actionError(error);
  }
}

export async function revokeRoleAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdministrator();
  try {
    await revokeRole(getDb(), actor, formString(formData, "grantId"));
    refresh();
    return { message: "Peran dicabut." };
  } catch (error) {
    return actionError(error);
  }
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdministrator();
  try {
    const { temporaryPassword } = await resetPassword(getDb(), actor, formString(formData, "userId"));
    return { message: "Kata sandi direset. Sesi pengguna diakhiri.", secret: temporaryPassword };
  } catch (error) {
    return actionError(error);
  }
}
