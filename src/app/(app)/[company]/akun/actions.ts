"use server";

import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { actionError, formString, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/session";
import { createSubAccount, renameAccount, setAccountActive } from "@/modules/accounting";

export async function createSubAccountAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  try {
    const account = await createSubAccount(getDb(), actor, {
      companyId: formString(formData, "companyId"),
      parentCode: formString(formData, "parentCode"),
      code: formString(formData, "code"),
      name: formString(formData, "name"),
    });
    refresh();
    return { message: `Sub-akun ${account.code} dibuat.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function renameAccountAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  try {
    await renameAccount(getDb(), actor, { accountId: formString(formData, "accountId"), name: formString(formData, "name") });
    refresh();
    return { message: "Nama akun diganti." };
  } catch (error) {
    return actionError(error);
  }
}

export async function setAccountActiveAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const active = formString(formData, "active") === "true";
  try {
    await setAccountActive(getDb(), actor, { accountId: formString(formData, "accountId"), active });
    refresh();
    return { message: active ? "Akun diaktifkan." : "Akun dinonaktifkan." };
  } catch (error) {
    return actionError(error);
  }
}
