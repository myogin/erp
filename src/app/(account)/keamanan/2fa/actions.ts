"use server";

import { getDb } from "@/db/client";
import { requireSignedIn } from "@/lib/session";
import { recordTwoFactorEnabled } from "@/modules/access";

export async function confirmTwoFactorEnabled(): Promise<void> {
  const user = await requireSignedIn();
  await recordTwoFactorEnabled(getDb(), user);
}
