import { ZodError } from "zod";
import { AccessDeniedError, AccessRuleError } from "@/modules/access";

export type ActionState = {
  error?: string;
  message?: string;
  secret?: string;
  /** The action finished a security step; the client should reload into the app. */
  done?: boolean;
};

/** Turns an expected domain error into a message for the form; anything else is rethrown. */
export function actionError(error: unknown): ActionState {
  if (error instanceof AccessDeniedError || error instanceof AccessRuleError) return { error: error.message };
  if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Data tidak valid." };
  throw error;
}

export function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
