import { sql } from "drizzle-orm";
import { bigserial, check, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "../../db/auth-schema";
import { ROLES } from "./roles";

export const roleEnum = pgEnum("role", ROLES);

export const company = pgTable(
  "company",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Short code used in Document Numbers, e.g. INV/CVA/2027/0001.
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    npwp: text("npwp"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [check("company_code_format", sql`${t.code} ~ '^[A-Z0-9]{2,10}$'`)],
);

export const roleGrant = pgTable(
  "role_grant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    // Null for the global roles (owner, admin); required for the per-Company ones.
    companyId: uuid("company_id").references(() => company.id, { onDelete: "cascade" }),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("role_grant_once").on(t.userId, t.role, t.companyId).nullsNotDistinct(),
    check("role_grant_scope", sql`(${t.role} in ('owner', 'admin')) = (${t.companyId} is null)`),
  ],
);

// Append-only: a trigger in the migration rejects UPDATE and DELETE.
// No foreign keys, so entries outlive the users and Companies they mention.
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  actorUserId: text("actor_user_id"),
  companyId: uuid("company_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
});
