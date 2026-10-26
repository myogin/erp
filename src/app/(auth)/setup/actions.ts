"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { actionError, formString, type ActionState } from "@/lib/action-state";
import { getAuth } from "@/lib/auth";
import { bootstrapOwner } from "@/modules/access";

export async function setupOwner(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  if (password !== formString(formData, "confirm")) return { error: "Konfirmasi kata sandi tidak sama." };

  try {
    await bootstrapOwner(getDb(), {
      name: formString(formData, "name"),
      email,
      password,
      allowedEmail: process.env.BOOTSTRAP_OWNER_EMAIL,
    });
  } catch (error) {
    return actionError(error);
  }
  await getAuth().api.signInEmail({ body: { email, password }, headers: await headers() });
  redirect("/keamanan/2fa");
}
