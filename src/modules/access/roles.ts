export const ROLES = ["owner", "admin", "finance", "hr", "management"] as const;
export type Role = (typeof ROLES)[number];

/** One Role held by a User; `companyId` is null for the global Roles. */
export type Grant = { id: string; role: Role; companyId: string | null };

/** Owner and Admin apply to every Company, including ones created later (ADR-0006). */
export const GLOBAL_ROLES = ["owner", "admin"] as const satisfies readonly Role[];
export const COMPANY_ROLES = ["finance", "hr", "management"] as const satisfies readonly Role[];

/** Roles that can see salary data, and therefore must use 2FA. */
export const TWO_FACTOR_ROLES = ["owner", "hr"] as const satisfies readonly Role[];

/**
 * Roles only an Owner may grant, revoke or reset the account of: anything that
 * sees salary data or administers the system. Otherwise an Admin could grant
 * themselves HR and read salaries (ADR-0006).
 */
export const OWNER_MANAGED_ROLES = ["owner", "admin", "hr"] as const satisfies readonly Role[];

export function isOwnerManagedRole(role: Role): boolean {
  return (OWNER_MANAGED_ROLES as readonly Role[]).includes(role);
}

export function isGlobalRole(role: Role): boolean {
  return (GLOBAL_ROLES as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Pemilik",
  admin: "Admin",
  finance: "Keuangan",
  hr: "HR",
  management: "Manajemen",
};
