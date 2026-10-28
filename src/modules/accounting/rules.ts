// Plain constants and checks, safe to import from client components.
import type { Grant, Role } from "@/modules/access/roles";

/** Account Types, with their UI labels. The keys follow Accurate's, which keeps the Account Mapping easy to check. */
export const ACCOUNT_TYPES = {
  CASH_BANK: "Kas & Bank",
  ACCOUNT_RECEIVABLE: "Piutang",
  INVENTORY: "Persediaan",
  OTHER_CURRENT_ASSET: "Aset Lancar Lainnya",
  FIXED_ASSET: "Aset Tetap",
  ACCUMULATED_DEPRECIATION: "Akumulasi Penyusutan",
  ACCOUNT_PAYABLE: "Utang Usaha",
  OTHER_CURRENT_LIABILITY: "Utang Lancar Lainnya",
  LONG_TERM_LIABILITY: "Utang Jangka Panjang",
  EQUITY: "Ekuitas",
  REVENUE: "Pendapatan",
  COGS: "Beban Pokok Penjualan",
  EXPENSE: "Beban",
  OTHER_INCOME: "Pendapatan Lain",
  OTHER_EXPENSE: "Beban Lain",
} as const;

export type AccountType = keyof typeof ACCOUNT_TYPES;

export const ACCOUNT_TYPE_KEYS = Object.keys(ACCOUNT_TYPES) as [AccountType, ...AccountType[]];

/** Document Types, each with its own Document Number sequence. Payroll (#13) adds its own. */
export const DOCUMENT_TYPES = ["JV"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const JOURNAL_STATUSES = ["draft", "posted"] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];
export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = { draft: "Draf", posted: "Diposting" };

/** e.g. JV/MERUBALI/2026/00001 (format to be confirmed by Finance, #22). */
export function formatDocumentNumber(type: DocumentType, companyCode: string, year: number, sequence: number): string {
  return `${type}/${companyCode}/${year}/${String(sequence).padStart(5, "0")}`;
}

/** Sub-account codes are the parent code plus two digits in this range; 01-49 belong to the template. */
export const SUB_ACCOUNT_FIRST = 50;
export const SUB_ACCOUNT_LAST = 99;

/** The first free Sub-account code under `parentCode`, or null when 50-99 are all taken. */
export function suggestSubAccountCode(parentCode: string, takenCodes: Iterable<string>): string | null {
  const taken = new Set(takenCodes);
  for (let n = SUB_ACCOUNT_FIRST; n <= SUB_ACCOUNT_LAST; n++) {
    const code = `${parentCode}${n}`;
    if (!taken.has(code)) return code;
  }
  return null;
}

/** Why `code` can't be a Sub-account of `parentCode`, or null if it can (uniqueness is checked by the server). */
export function subAccountCodeProblem(parentCode: string, code: string): string | null {
  const suffix = code.slice(parentCode.length);
  if (!code.startsWith(parentCode) || !/^\d{2}$/.test(suffix)) {
    return `Kode sub-akun harus kode induk (${parentCode}) ditambah 2 angka.`;
  }
  const n = Number(suffix);
  if (n < SUB_ACCOUNT_FIRST || n > SUB_ACCOUNT_LAST) {
    return `Dua angka terakhir harus ${SUB_ACCOUNT_FIRST}–${SUB_ACCOUNT_LAST}; 01–49 dicadangkan untuk template.`;
  }
  return null;
}

function holds(grants: Grant[], companyId: string, globalRoles: Role[], companyRoles: Role[]): boolean {
  return grants.some((g) =>
    g.companyId === null ? globalRoles.includes(g.role) : g.companyId === companyId && companyRoles.includes(g.role),
  );
}

/** Owner, and Finance or Management of this Company. Admin and HR don't see the books (issue #5). */
export function canViewChartOfAccounts(grants: Grant[], companyId: string): boolean {
  return holds(grants, companyId, ["owner"], ["finance", "management"]);
}

/** Owner, and Finance of this Company. */
export function canEditChartOfAccounts(grants: Grant[], companyId: string): boolean {
  return holds(grants, companyId, ["owner"], ["finance"]);
}
