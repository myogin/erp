"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { actionError, formString, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/session";
import { deleteDraft, reverseEntry, saveAndPost, saveDraft, type JournalLineInput } from "@/modules/accounting";

/**
 * The journal form. `intent` is "post" to save and post in one step (nothing is
 * kept if Posting fails), anything else saves a Draft. Lines arrive as JSON.
 */
export async function saveJournalAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const companyCode = formString(formData, "companyCode");
  const input = {
    entryId: formString(formData, "entryId") || undefined,
    companyId: formString(formData, "companyId"),
    date: formString(formData, "date"),
    description: formString(formData, "description"),
    lines: JSON.parse(formString(formData, "lines") || "[]") as JournalLineInput[],
  };
  let id: string;
  try {
    id = formData.get("intent") === "post" ? (await saveAndPost(getDb(), actor, input)).id : (await saveDraft(getDb(), actor, input)).id;
  } catch (error) {
    return actionError(error);
  }
  // Outside the try: redirect() works by throwing.
  redirect(`/${companyCode.toLowerCase()}/jurnal/${id}`);
}

export async function deleteDraftAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  try {
    await deleteDraft(getDb(), actor, formString(formData, "entryId"));
  } catch (error) {
    return actionError(error);
  }
  redirect(`/${formString(formData, "companyCode").toLowerCase()}/jurnal`);
}

export async function reverseEntryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  let id: string;
  try {
    ({ id } = await reverseEntry(getDb(), actor, {
      entryId: formString(formData, "entryId"),
      date: formString(formData, "date"),
      reason: formString(formData, "reason"),
    }));
  } catch (error) {
    return actionError(error);
  }
  redirect(`/${formString(formData, "companyCode").toLowerCase()}/jurnal/${id}`);
}
