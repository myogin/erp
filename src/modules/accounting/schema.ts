import { sql } from "drizzle-orm";
import { boolean, check, pgEnum, pgTable, text, timestamp, unique, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { company } from "../access/schema";
import { ACCOUNT_TYPE_KEYS } from "./rules";

export const accountTypeEnum = pgEnum("account_type", ACCOUNT_TYPE_KEYS);

// An Account in one Company's Chart of Accounts. Named chart_account because
// Better Auth already owns the "account" table.
export const chartAccount = pgTable(
  "chart_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => company.id),
    // Fixed once created: Journal Entries and the Account Mapping refer to it.
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => chartAccount.id),
    // Copied from the COA Template (and kept in sync with it) rather than a Sub-account.
    fromTemplate: boolean("from_template").notNull(),
    // Groups the Accounts beneath it and never receives a Posting.
    isHeader: boolean("is_header").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("chart_account_code_per_company").on(t.companyId, t.code),
    check("chart_account_code_format", sql`${t.code} ~ '^[0-9]{4}([0-9]{2})*$'`),
    // Sub-accounts sit under a parent and use 50-99, so the template's 01-49 never collide with them.
    check(
      "chart_account_sub_account_code",
      sql`${t.fromTemplate} or (${t.parentId} is not null and right(${t.code}, 2)::int between 50 and 99)`,
    ),
  ],
);
