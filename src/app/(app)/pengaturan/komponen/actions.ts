"use server";

import { type ActionState, formString } from "@/lib/action-state";
import { formatRupiah, money } from "@/lib/money";
import { requireAdministrator } from "@/lib/session";
import { formatIsoDate } from "@/lib/time";

// Demo actions for the component showcase. They change nothing.

export async function demoSubmit(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdministrator();
  const amount = formString(formData, "amount");
  const date = formString(formData, "date");
  if (!formString(formData, "description").trim()) return { error: "Keterangan wajib diisi." };
  return {
    message: `Diterima di server: ${formatIsoDate(date)}, ${formatRupiah(money(amount || 0))} (nilai mentah "${amount}", "${date}")`,
  };
}

export async function demoConfirm(): Promise<ActionState> {
  await requireAdministrator();
  return { message: "Aksi contoh dijalankan. Tidak ada data yang berubah." };
}

export async function demoSecret(): Promise<ActionState> {
  await requireAdministrator();
  return { message: "Rahasia contoh dibuat.", secret: "Contoh-Rahasia-42" };
}
