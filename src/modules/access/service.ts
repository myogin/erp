import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { account, session, user } from "@/db/auth-schema";
import { AccessDeniedError, AccessRuleError } from "./errors";
import { COMPANY_ROLES, GLOBAL_ROLES, isGlobalRole, isOwnerManagedRole, ROLES, TWO_FACTOR_ROLES, type Grant, type Role } from "./roles";
import { MIN_PASSWORD_LENGTH, RESERVED_COMPANY_CODES } from "./rules";
// Not the accounting index: that would import this module back (ADR-0005 still holds,
// createChartOfAccounts is the accounting entry point for a new Company).
import { createChartOfAccounts } from "../accounting/chart";
import { auditLog, company, roleGrant } from "./schema";

/** The User performing an action, as resolved by the caller (UI, API or agent). */
export type Actor = { userId: string };

export type Company = typeof company.$inferSelect;

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

// ---------------------------------------------------------------------------
// Reading grants

export async function getGrants(db: Executor, userId: string): Promise<Grant[]> {
  return db
    .select({ id: roleGrant.id, role: roleGrant.role, companyId: roleGrant.companyId })
    .from(roleGrant)
    .where(eq(roleGrant.userId, userId));
}

function hasGlobalRole(grants: Grant[], ...roles: Role[]): boolean {
  return grants.some((g) => g.companyId === null && roles.includes(g.role));
}

export function canAccessCompany(grants: Grant[], companyId: string): boolean {
  return hasGlobalRole(grants, ...GLOBAL_ROLES) || grants.some((g) => g.companyId === companyId);
}

/** Holds a global Role (Owner or Admin), so may administer Users and Companies. */
export function isAdministrator(grants: Grant[]): boolean {
  return hasGlobalRole(grants, ...GLOBAL_ROLES);
}

export function requiresTwoFactor(grants: Grant[]): boolean {
  return grants.some((g) => (TWO_FACTOR_ROLES as readonly Role[]).includes(g.role));
}

async function requireAdministrator(db: Executor, actor: Actor): Promise<Grant[]> {
  const grants = await getGrants(db, actor.userId);
  if (!hasGlobalRole(grants, "owner", "admin")) throw new AccessDeniedError();
  return grants;
}

/** Throws unless the actor holds any Role covering the Company. */
export async function assertCompanyAccess(db: Executor, actor: Actor, companyId: string): Promise<void> {
  if (!canAccessCompany(await getGrants(db, actor.userId), companyId)) throw new AccessDeniedError();
}

/** The Company with this code (from the URL, any case), or null if it doesn't exist or the actor can't access it. */
export async function findAccessibleCompany(db: Executor, actor: Actor, code: string): Promise<Company | null> {
  const [found] = await db.select().from(company).where(eq(company.code, code.toUpperCase()));
  if (!found || !canAccessCompany(await getGrants(db, actor.userId), found.id)) return null;
  return found;
}

export async function listAccessibleCompanies(db: Executor, actor: Actor): Promise<Company[]> {
  const grants = await getGrants(db, actor.userId);
  if (hasGlobalRole(grants, ...GLOBAL_ROLES)) {
    return db.select().from(company).orderBy(asc(company.code));
  }
  const ids = [...new Set(grants.flatMap((g) => (g.companyId ? [g.companyId] : [])))];
  if (ids.length === 0) return [];
  return db.select().from(company).where(inArray(company.id, ids)).orderBy(asc(company.code));
}

// ---------------------------------------------------------------------------
// Paging for list screens (docs/ui.md: tables page on the server)

export type PageQuery = { page?: number; pageSize?: number };

function paging(query: PageQuery) {
  const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

// ---------------------------------------------------------------------------
// Audit log

type AuditEntry = {
  actorUserId: string | null;
  action: string;
  companyId?: string | null;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

/** Appends to the Audit Log; other modules record their sensitive actions through this. */
export async function audit(db: Executor, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values(entry);
}

export type AuditLogQuery = PageQuery & {
  search?: string;
  /** Actions that also match the search, e.g. those whose UI label contains it. */
  matchingActions?: string[];
};

/** Newest first. Search matches the action, the actor's name or the Company code. */
export async function listAuditLog(db: Db, actor: Actor, query: AuditLogQuery = {}) {
  await requireAdministrator(db, actor);
  const { page, pageSize, offset } = paging(query);
  const term = query.search?.trim();
  const where = term
    ? or(
        ilike(auditLog.action, `%${term}%`),
        ilike(user.name, `%${term}%`),
        ilike(company.code, `%${term}%`),
        query.matchingActions?.length ? inArray(auditLog.action, query.matchingActions) : undefined,
      )
    : undefined;
  const from = () =>
    db
      .select({
        id: auditLog.id,
        at: auditLog.at,
        action: auditLog.action,
        actorName: user.name,
        companyCode: company.code,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        details: auditLog.details,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorUserId))
      .leftJoin(company, eq(company.id, auditLog.companyId))
      .where(where);

  const [{ total }] = await db
    .select({ total: count() })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .leftJoin(company, eq(company.id, auditLog.companyId))
    .where(where);
  const rows = await from().orderBy(desc(auditLog.id)).limit(pageSize).offset(offset);
  return { rows, total, page, pageSize };
}

// ---------------------------------------------------------------------------
// Users

const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH, `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`);
const emailSchema = z.email("Email tidak valid.").transform((e) => e.toLowerCase());
const nameSchema = z.string().trim().min(1, "Nama wajib diisi.");

/** A random password the User must replace at first login. */
function temporaryPassword(): string {
  return randomBytes(12).toString("base64url");
}

async function insertUserWithPassword(
  tx: Tx,
  input: { name: string; email: string; password: string; mustChangePassword: boolean },
): Promise<string> {
  const existing = await tx.select({ id: user.id }).from(user).where(eq(user.email, input.email));
  if (existing.length > 0) throw new AccessRuleError("Email sudah dipakai pengguna lain.");

  const id = randomUUID();
  await tx.insert(user).values({
    id,
    name: input.name,
    email: input.email,
    emailVerified: true,
    mustChangePassword: input.mustChangePassword,
  });
  await tx.insert(account).values({
    id: randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: await hashPassword(input.password),
  });
  return id;
}

/**
 * Creates the first Owner on a fresh install. Works only while no User exists,
 * and only for the email configured in BOOTSTRAP_OWNER_EMAIL.
 */
export async function bootstrapOwner(
  db: Db,
  input: { name: string; email: string; password: string; allowedEmail: string | undefined },
): Promise<{ userId: string }> {
  const email = emailSchema.parse(input.email);
  const name = nameSchema.parse(input.name);
  const password = passwordSchema.parse(input.password);
  if (!input.allowedEmail || email !== input.allowedEmail.trim().toLowerCase()) {
    throw new AccessDeniedError("Email ini tidak diizinkan untuk setup awal.");
  }

  return db.transaction(async (tx) => {
    // Serialise concurrent setup attempts so only one can see an empty user table.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('erp.bootstrap_owner'))`);
    const [{ users }] = await tx.select({ users: count() }).from(user);
    if (users > 0) throw new AccessDeniedError("Setup awal sudah dilakukan.");

    const userId = await insertUserWithPassword(tx, { name, email, password, mustChangePassword: false });
    await tx.insert(roleGrant).values({ userId, role: "owner" });
    await audit(tx, { actorUserId: userId, action: "setup.owner_created", targetType: "user", targetId: userId });
    return { userId };
  });
}

export async function isSetupComplete(db: Db): Promise<boolean> {
  const [{ users }] = await db.select({ users: count() }).from(user);
  return users > 0;
}

export async function createUser(
  db: Db,
  actor: Actor,
  input: { name: string; email: string },
): Promise<{ userId: string; temporaryPassword: string }> {
  const email = emailSchema.parse(input.email);
  const name = nameSchema.parse(input.name);
  const password = temporaryPassword();

  return db.transaction(async (tx) => {
    await requireAdministrator(tx, actor);
    const userId = await insertUserWithPassword(tx, { name, email, password, mustChangePassword: true });
    await audit(tx, { actorUserId: actor.userId, action: "user.create", targetType: "user", targetId: userId, details: { email } });
    return { userId, temporaryPassword: password };
  });
}

const OWNER_ONLY = "Hanya Pemilik yang dapat mengelola peran Pemilik, Admin, atau HR.";

/** An Admin may not manage a User holding an owner-managed Role, nor grant or revoke one. */
async function assertCanManage(tx: Tx, actorGrants: Grant[], targetUserId: string, role?: Role): Promise<void> {
  if (hasGlobalRole(actorGrants, "owner")) return;
  if (role && isOwnerManagedRole(role)) throw new AccessDeniedError(OWNER_ONLY);
  if ((await getGrants(tx, targetUserId)).some((g) => isOwnerManagedRole(g.role))) {
    throw new AccessDeniedError(OWNER_ONLY);
  }
}

export async function resetPassword(
  db: Db,
  actor: Actor,
  userId: string,
): Promise<{ temporaryPassword: string }> {
  const password = temporaryPassword();
  return db.transaction(async (tx) => {
    const grants = await requireAdministrator(tx, actor);
    await assertCanManage(tx, grants, userId);

    const updated = await tx
      .update(account)
      .set({ password: await hashPassword(password) })
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
      .returning({ id: account.id });
    if (updated.length === 0) throw new AccessRuleError("Pengguna tidak ditemukan.");

    await tx.update(user).set({ mustChangePassword: true }).where(eq(user.id, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await audit(tx, { actorUserId: actor.userId, action: "user.password_reset", targetType: "user", targetId: userId });
    return { temporaryPassword: password };
  });
}

/** Called after the User replaced their temporary password through Better Auth. */
export async function completePasswordChange(db: Db, actor: Actor): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(user).set({ mustChangePassword: false }).where(eq(user.id, actor.userId));
    await audit(tx, { actorUserId: actor.userId, action: "user.password_changed", targetType: "user", targetId: actor.userId });
  });
}

export async function recordTwoFactorEnabled(db: Db, actor: Actor): Promise<void> {
  const [row] = await db.select({ enabled: user.twoFactorEnabled }).from(user).where(eq(user.id, actor.userId));
  if (!row?.enabled) throw new AccessRuleError("2FA belum aktif.");
  await audit(db, { actorUserId: actor.userId, action: "user.two_factor_enabled", targetType: "user", targetId: actor.userId });
}

export type UserListQuery = PageQuery & {
  search?: string;
  /** Column to sort by; prefix with "-" for descending. */
  sort?: "name" | "-name" | "email" | "-email";
};

export async function listUsers(db: Db, actor: Actor, query: UserListQuery = {}) {
  await requireAdministrator(db, actor);
  const { page, pageSize, offset } = paging(query);
  const term = query.search?.trim();
  const where = term ? or(ilike(user.name, `%${term}%`), ilike(user.email, `%${term}%`)) : undefined;
  const sort = query.sort ?? "name";
  const column = sort.endsWith("email") ? user.email : user.name;

  const [{ total }] = await db.select({ total: count() }).from(user).where(where);
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      mustChangePassword: user.mustChangePassword,
    })
    .from(user)
    .where(where)
    .orderBy(sort.startsWith("-") ? desc(column) : asc(column), asc(user.id))
    .limit(pageSize)
    .offset(offset);

  const ids = users.map((u) => u.id);
  const grants = ids.length
    ? await db
        .select({ id: roleGrant.id, userId: roleGrant.userId, role: roleGrant.role, companyId: roleGrant.companyId, companyCode: company.code })
        .from(roleGrant)
        .leftJoin(company, eq(company.id, roleGrant.companyId))
        .where(inArray(roleGrant.userId, ids))
    : [];
  return {
    rows: users.map((u) => ({ ...u, grants: grants.filter((g) => g.userId === u.id) })),
    total,
    page,
    pageSize,
  };
}

/** Name and id of every User, for pickers such as "grant a Role to …". */
export async function listUserOptions(db: Db, actor: Actor) {
  await requireAdministrator(db, actor);
  return db.select({ id: user.id, name: user.name, email: user.email }).from(user).orderBy(asc(user.name));
}

// ---------------------------------------------------------------------------
// Companies

const companyInput = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, "Kode 2–10 huruf besar/angka, mis. CVA.")
    .refine((code) => !RESERVED_COMPANY_CODES.includes(code), "Kode ini dipakai sistem; pilih kode lain."),
  name: nameSchema,
  npwp: z
    .string()
    .trim()
    .transform((v) => v || null)
    .nullish(),
});

export type CompanyListQuery = PageQuery & {
  search?: string;
  sort?: "code" | "-code" | "name" | "-name";
};

/** Companies for the settings screen. Search matches code, name or NPWP. */
export async function listCompanies(db: Db, actor: Actor, query: CompanyListQuery = {}) {
  await requireAdministrator(db, actor);
  const { page, pageSize, offset } = paging(query);
  const term = query.search?.trim();
  const where = term
    ? or(ilike(company.code, `%${term}%`), ilike(company.name, `%${term}%`), ilike(company.npwp, `%${term}%`))
    : undefined;
  const sort = query.sort ?? "code";
  const column = sort.endsWith("name") ? company.name : company.code;

  const [{ total }] = await db.select({ total: count() }).from(company).where(where);
  const rows = await db
    .select()
    .from(company)
    .where(where)
    .orderBy(sort.startsWith("-") ? desc(column) : asc(column), asc(company.id))
    .limit(pageSize)
    .offset(offset);
  return { rows, total, page, pageSize };
}

export async function createCompany(
  db: Db,
  actor: Actor,
  input: { code: string; name: string; npwp?: string | null },
): Promise<Company> {
  const data = companyInput.parse(input);
  return db.transaction(async (tx) => {
    await requireAdministrator(tx, actor);
    const existing = await tx.select({ id: company.id }).from(company).where(eq(company.code, data.code));
    if (existing.length > 0) throw new AccessRuleError(`Kode ${data.code} sudah dipakai.`);

    const [created] = await tx.insert(company).values({ code: data.code, name: data.name, npwp: data.npwp ?? null }).returning();
    await createChartOfAccounts(tx, created.id);
    await audit(tx, {
      actorUserId: actor.userId,
      action: "company.create",
      companyId: created.id,
      targetType: "company",
      targetId: created.id,
      details: { code: created.code, name: created.name },
    });
    return created;
  });
}

// ---------------------------------------------------------------------------
// Roles

const grantInput = z
  .object({ userId: z.string().min(1), role: z.enum(ROLES), companyId: z.uuid().nullish() })
  .refine((g) => (isGlobalRole(g.role) ? !g.companyId : !!g.companyId), {
    message: `Peran ${GLOBAL_ROLES.join("/")} berlaku untuk semua perusahaan; peran ${COMPANY_ROLES.join("/")} harus memilih perusahaan.`,
  });

export async function grantRole(
  db: Db,
  actor: Actor,
  input: { userId: string; role: Role; companyId?: string | null },
): Promise<{ grantId: string }> {
  const data = grantInput.parse(input);
  const companyId = data.companyId ?? null;
  return db.transaction(async (tx) => {
    const grants = await requireAdministrator(tx, actor);
    await assertCanManage(tx, grants, data.userId, data.role);

    const [created] = await tx
      .insert(roleGrant)
      .values({ userId: data.userId, role: data.role, companyId, grantedBy: actor.userId })
      .onConflictDoNothing()
      .returning({ id: roleGrant.id });
    if (!created) throw new AccessRuleError("Pengguna sudah memiliki peran ini.");

    await audit(tx, {
      actorUserId: actor.userId,
      action: "role.grant",
      companyId,
      targetType: "user",
      targetId: data.userId,
      details: { role: data.role },
    });
    return { grantId: created.id };
  });
}

export async function revokeRole(db: Db, actor: Actor, grantId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const grants = await requireAdministrator(tx, actor);
    const [target] = await tx.select().from(roleGrant).where(eq(roleGrant.id, grantId)).for("update");
    if (!target) throw new AccessRuleError("Peran tidak ditemukan.");
    await assertCanManage(tx, grants, target.userId, target.role);

    if (target.role === "owner") {
      // Lock all owner grants so two concurrent revocations can't both pass this check.
      const owners = await tx
        .select({ id: roleGrant.id })
        .from(roleGrant)
        .where(and(eq(roleGrant.role, "owner"), isNull(roleGrant.companyId)))
        .for("update");
      if (owners.length <= 1) throw new AccessRuleError("Tidak bisa mencabut Pemilik terakhir.");
    }

    await tx.delete(roleGrant).where(eq(roleGrant.id, grantId));
    await audit(tx, {
      actorUserId: actor.userId,
      action: "role.revoke",
      companyId: target.companyId,
      targetType: "user",
      targetId: target.userId,
      details: { role: target.role },
    });
  });
}
