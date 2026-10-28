import { ROLE_LABELS, type Role } from "@/modules/access/roles";

// Indonesian labels for audit actions, shared by the Audit Log screen and its export.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "setup.owner_created": "Setup awal: Pemilik dibuat",
  "company.create": "Perusahaan dibuat",
  "user.create": "Pengguna dibuat",
  "user.password_reset": "Kata sandi direset",
  "user.password_changed": "Kata sandi diganti",
  "user.two_factor_enabled": "2FA diaktifkan",
  "role.grant": "Peran diberikan",
  "role.revoke": "Peran dicabut",
  "account.create": "Sub-akun dibuat",
  "account.rename": "Nama akun diganti",
  "account.deactivate": "Akun dinonaktifkan",
  "account.activate": "Akun diaktifkan",
  "journal.post": "Jurnal diposting",
  "journal.delete_draft": "Draf jurnal dihapus",
  "journal.reverse": "Jurnal dibalik",
  "period.close": "Tutup buku",
  "period.reopen": "Periode dibuka kembali",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

/** Actions whose label contains the search term, so users can search what they see. */
export function actionsMatchingLabel(search: string | undefined): string[] {
  const term = search?.trim().toLowerCase();
  if (!term) return [];
  return Object.entries(AUDIT_ACTION_LABELS)
    .filter(([, label]) => label.toLowerCase().includes(term))
    .map(([action]) => action);
}

const DETAIL_LABELS: Record<string, string> = {
  code: "Kode",
  name: "Nama",
  previousName: "Nama lama",
  email: "Email",
  role: "Peran",
  number: "Nomor",
  total: "Total",
  description: "Keterangan",
  reversal: "Jurnal balik",
  period: "Periode",
  reason: "Alasan",
};

/** An entry's details as readable text, e.g. "Kode: CVA · Nama: CV Alpha". */
export function formatAuditDetails(details: Record<string, unknown> | null): string {
  if (!details) return "";
  return Object.entries(details)
    .map(([key, value]) => {
      const shown = key === "role" && typeof value === "string" ? (ROLE_LABELS[value as Role] ?? value) : String(value);
      return `${DETAIL_LABELS[key] ?? key}: ${shown}`;
    })
    .join(" · ");
}
