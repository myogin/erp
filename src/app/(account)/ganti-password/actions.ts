"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { getDb } from "@/db/client";
import { formString, type ActionState } from "@/lib/action-state";
import { getAuth } from "@/lib/auth";
import { requireSignedIn } from "@/lib/session";
import { completePasswordChange, MIN_PASSWORD_LENGTH } from "@/modules/access";

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSignedIn();
  const newPassword = formString(formData, "newPassword");
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { error: `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.` };
  if (newPassword !== formString(formData, "confirm")) return { error: "Konfirmasi kata sandi tidak sama." };

  try {
    await getAuth().api.changePassword({
      headers: await headers(),
      body: { currentPassword: formString(formData, "currentPassword"), newPassword, revokeOtherSessions: true },
    });
  } catch (error) {
    if (error instanceof APIError) return { error: "Kata sandi lama salah." };
    throw error;
  }
  await completePasswordChange(getDb(), user);
  return { message: "Kata sandi diganti.", done: true };
}
