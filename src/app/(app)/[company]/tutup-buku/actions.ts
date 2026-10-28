"use server";

import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { actionError, formString, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/session";
import { formatMonth } from "@/lib/time";
import { closePeriod, reopenPeriod } from "@/modules/accounting";

export async function closePeriodAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const month = formString(formData, "month");
  try {
    await closePeriod(getDb(), actor, { companyId: formString(formData, "companyId"), month });
    refresh();
    return { message: `${formatMonth(month)} ditutup.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function reopenPeriodAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const month = formString(formData, "month");
  try {
    await reopenPeriod(getDb(), actor, { companyId: formString(formData, "companyId"), month, reason: formString(formData, "reason") });
    refresh();
    return { message: `${formatMonth(month)} dibuka kembali.` };
  } catch (error) {
    return actionError(error);
  }
}
