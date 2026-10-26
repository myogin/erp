import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { account, user } from "@/db/auth-schema";
import { resetDb, connectTestDb } from "../../../test/db";
import {
  AccessDeniedError,
  AccessRuleError,
  assertCompanyAccess,
  bootstrapOwner,
  createCompany,
  createUser,
  findAccessibleCompany,
  getGrants,
  grantRole,
  listAccessibleCompanies,
  listAuditLog,
  listUsers,
  requiresTwoFactor,
  resetPassword,
  revokeRole,
  type Actor,
} from ".";

const db = connectTestDb();
const OWNER_EMAIL = "owner@example.com";

async function setupOwner(): Promise<Actor> {
  return bootstrapOwner(db, { name: "Owner", email: OWNER_EMAIL, password: "password-owner", allowedEmail: OWNER_EMAIL });
}

/** A new User holding the given grants, created by the Owner. */
async function userWith(owner: Actor, email: string, grants: { role: "owner" | "admin" | "finance" | "hr" | "management"; companyId?: string }[]) {
  const { userId } = await createUser(db, owner, { name: email, email });
  for (const g of grants) await grantRole(db, owner, { userId, ...g });
  return { userId };
}

beforeEach(() => resetDb(db));

describe("first-run setup", () => {
  it("creates the first Owner only for the configured email", async () => {
    await expect(
      bootstrapOwner(db, { name: "X", email: "intruder@example.com", password: "password-x", allowedEmail: OWNER_EMAIL }),
    ).rejects.toThrow(AccessDeniedError);

    const owner = await setupOwner();
    expect((await getGrants(db, owner.userId)).map((g) => g.role)).toEqual(["owner"]);
  });

  it("works only once, even when two setups race", async () => {
    const results = await Promise.allSettled([setupOwner(), setupOwner()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(setupOwner()).rejects.toThrow(AccessDeniedError);
  });
});

describe("users", () => {
  it("creates a User whose temporary password works and must be changed", async () => {
    const owner = await setupOwner();
    const { userId, temporaryPassword } = await createUser(db, owner, { name: "Sari", email: "Sari@Example.com" });

    const [row] = await db.select().from(user).where(eq(user.id, userId));
    const [cred] = await db.select().from(account).where(eq(account.userId, userId));
    expect(row.email).toBe("sari@example.com");
    expect(row.mustChangePassword).toBe(true);
    expect(await verifyPassword({ hash: cred.password!, password: temporaryPassword })).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    const owner = await setupOwner();
    await expect(createUser(db, owner, { name: "Owner 2", email: OWNER_EMAIL })).rejects.toThrow(AccessRuleError);
  });

  it("lets only Owner and Admin create Users", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const finance = await userWith(owner, "fin@example.com", [{ role: "finance", companyId: cva.id }]);
    await expect(createUser(db, finance, { name: "Y", email: "y@example.com" })).rejects.toThrow(AccessDeniedError);
  });
});

describe("user list", () => {
  it("searches, sorts and pages on the server", async () => {
    const owner = await setupOwner();
    for (const n of ["Budi", "Citra", "Dewi", "Eko"]) await createUser(db, owner, { name: n, email: `${n.toLowerCase()}@example.com` });

    const firstPage = await listUsers(db, owner, { sort: "-name", page: 1, pageSize: 2 });
    expect(firstPage.total).toBe(5);
    expect(firstPage.rows.map((u) => u.name)).toEqual(["Owner", "Eko"]);
    expect((await listUsers(db, owner, { sort: "-name", page: 3, pageSize: 2 })).rows.map((u) => u.name)).toEqual(["Budi"]);

    const search = await listUsers(db, owner, { search: "CITRA@" });
    expect(search.total).toBe(1);
    expect(search.rows[0].name).toBe("Citra");
  });
});

describe("company access", () => {
  it("limits per-Company Roles to their Company, while Owner and Admin see all", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "cva", name: "CV A" });
    const cvb = await createCompany(db, owner, { code: "CVB", name: "CV B" });
    const finA = await userWith(owner, "fin-a@example.com", [{ role: "finance", companyId: cva.id }]);
    const admin = await userWith(owner, "admin@example.com", [{ role: "admin" }]);

    await expect(assertCompanyAccess(db, finA, cva.id)).resolves.toBeUndefined();
    await expect(assertCompanyAccess(db, finA, cvb.id)).rejects.toThrow(AccessDeniedError);
    expect((await listAccessibleCompanies(db, finA)).map((c) => c.code)).toEqual(["CVA"]);
    expect((await listAccessibleCompanies(db, admin)).map((c) => c.code)).toEqual(["CVA", "CVB"]);

    expect((await findAccessibleCompany(db, finA, "cva"))?.id).toBe(cva.id);
    expect(await findAccessibleCompany(db, finA, "cvb")).toBeNull();
    expect(await findAccessibleCompany(db, finA, "nope")).toBeNull();

    // A Company created later is covered by the global Roles automatically.
    const cvc = await createCompany(db, admin, { code: "CVC", name: "CV C" });
    await expect(assertCompanyAccess(db, admin, cvc.id)).resolves.toBeUndefined();
  });

  it("rejects a duplicate or malformed Company code", async () => {
    const owner = await setupOwner();
    await createCompany(db, owner, { code: "CVA", name: "CV A" });
    await expect(createCompany(db, owner, { code: "CVA", name: "Lain" })).rejects.toThrow(AccessRuleError);
    await expect(createCompany(db, owner, { code: "CV A!", name: "Lain" })).rejects.toThrow();
  });

  it("rejects codes that would shadow an app route in the URL", async () => {
    const owner = await setupOwner();
    await expect(createCompany(db, owner, { code: "pengaturan", name: "X" })).rejects.toThrow(/dipakai sistem/);
  });
});

describe("role management", () => {
  it("requires a Company for per-Company Roles and none for global Roles", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const { userId } = await createUser(db, owner, { name: "U", email: "u@example.com" });
    await expect(grantRole(db, owner, { userId, role: "finance" })).rejects.toThrow();
    await expect(grantRole(db, owner, { userId, role: "admin", companyId: cva.id })).rejects.toThrow();
  });

  it("stops an Admin from granting salary-visible or administrative Roles, including to themselves", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const admin = await userWith(owner, "admin@example.com", [{ role: "admin" }]);
    const staff = await userWith(owner, "staff@example.com", []);

    await expect(grantRole(db, admin, { userId: admin.userId, role: "hr", companyId: cva.id })).rejects.toThrow(AccessDeniedError);
    await expect(grantRole(db, admin, { userId: staff.userId, role: "hr", companyId: cva.id })).rejects.toThrow(AccessDeniedError);
    await expect(grantRole(db, admin, { userId: staff.userId, role: "admin" })).rejects.toThrow(AccessDeniedError);
    await expect(grantRole(db, admin, { userId: staff.userId, role: "finance", companyId: cva.id })).resolves.toBeDefined();
  });

  it("stops an Admin from resetting the password of an Owner, Admin or HR User", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const admin = await userWith(owner, "admin@example.com", [{ role: "admin" }]);
    const hr = await userWith(owner, "hr@example.com", [{ role: "hr", companyId: cva.id }]);
    const fin = await userWith(owner, "fin@example.com", [{ role: "finance", companyId: cva.id }]);

    await expect(resetPassword(db, admin, owner.userId)).rejects.toThrow(AccessDeniedError);
    await expect(resetPassword(db, admin, hr.userId)).rejects.toThrow(AccessDeniedError);
    await expect(resetPassword(db, admin, fin.userId)).resolves.toHaveProperty("temporaryPassword");
    await expect(resetPassword(db, owner, hr.userId)).resolves.toHaveProperty("temporaryPassword");
  });

  it("never revokes the last Owner", async () => {
    const owner = await setupOwner();
    const [ownerGrant] = await getGrants(db, owner.userId);
    await expect(revokeRole(db, owner, ownerGrant.id)).rejects.toThrow(AccessRuleError);

    const second = await userWith(owner, "owner2@example.com", [{ role: "owner" }]);
    await revokeRole(db, second, ownerGrant.id);
    expect(await getGrants(db, owner.userId)).toEqual([]);
  });

  it("requires 2FA exactly for Owner and HR", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const hr = await userWith(owner, "hr@example.com", [{ role: "hr", companyId: cva.id }]);
    const admin = await userWith(owner, "admin@example.com", [{ role: "admin" }]);

    expect(requiresTwoFactor(await getGrants(db, owner.userId))).toBe(true);
    expect(requiresTwoFactor(await getGrants(db, hr.userId))).toBe(true);
    expect(requiresTwoFactor(await getGrants(db, admin.userId))).toBe(false);
  });
});

describe("audit log", () => {
  it("records sensitive actions with actor, Company and time", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const fin = await userWith(owner, "fin@example.com", [{ role: "finance", companyId: cva.id }]);
    await resetPassword(db, owner, fin.userId);

    const entries = await listAuditLog(db, owner);
    expect(entries.map((e) => e.action)).toEqual([
      "user.password_reset",
      "role.grant",
      "user.create",
      "company.create",
      "setup.owner_created",
    ]);
    const grant = entries.find((e) => e.action === "role.grant")!;
    expect(grant).toMatchObject({ actorName: "Owner", companyCode: "CVA", details: { role: "finance" } });
    expect(grant.at).toBeInstanceOf(Date);
  });

  it("cannot be edited or deleted", async () => {
    await setupOwner();
    // Drizzle wraps the Postgres error; the trigger's message is on `cause`.
    const appendOnly = { cause: expect.objectContaining({ message: "audit_log is append-only" }) };
    await expect(db.execute(sql`update audit_log set action = 'x'`)).rejects.toMatchObject(appendOnly);
    await expect(db.execute(sql`delete from audit_log`)).rejects.toMatchObject(appendOnly);
  });

  it("is readable only by Owner and Admin", async () => {
    const owner = await setupOwner();
    const cva = await createCompany(db, owner, { code: "CVA", name: "CV A" });
    const mgmt = await userWith(owner, "mgmt@example.com", [{ role: "management", companyId: cva.id }]);
    await expect(listAuditLog(db, mgmt)).rejects.toThrow(AccessDeniedError);
  });
});
