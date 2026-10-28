import { sql } from "drizzle-orm";
import { boolean, check, date, integer, numeric, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { user } from "../../db/auth-schema";
import { company } from "../access/schema";
import { ACCOUNT_TYPE_KEYS, DOCUMENT_TYPES, JOURNAL_STATUSES } from "./rules";

export const accountTypeEnum = pgEnum("account_type", ACCOUNT_TYPE_KEYS);
export const documentTypeEnum = pgEnum("document_type", DOCUMENT_TYPES);
export const journalStatusEnum = pgEnum("journal_status", JOURNAL_STATUSES);

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

// A Journal Entry. Triggers in the migration keep a posted entry and its lines
// immutable and refuse to post one whose lines don't balance (ADR-0003).
export const journalEntry = pgTable(
  "journal_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => company.id),
    documentType: documentTypeEnum("document_type").notNull(),
    status: journalStatusEnum("status").notNull().default("draft"),
    date: date("date", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    // Given at Posting: the year of `date` and the next number in that year's sequence.
    year: integer("year"),
    sequence: integer("sequence"),
    documentNumber: text("document_number"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    postedBy: text("posted_by").references(() => user.id, { onDelete: "set null" }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    // Set on a Reversal: the posted entry it cancels. Unique, so an entry is reversed at most once.
    reversesEntryId: uuid("reverses_entry_id")
      .unique("journal_entry_reversed_once")
      .references((): AnyPgColumn => journalEntry.id),
  },
  (t) => [
    unique("journal_entry_sequence").on(t.companyId, t.documentType, t.year, t.sequence),
    unique("journal_entry_document_number").on(t.companyId, t.documentNumber),
    check(
      "journal_entry_numbered_when_posted",
      sql`(${t.status} = 'posted') = (${t.documentNumber} is not null and ${t.year} is not null and ${t.sequence} is not null and ${t.postedAt} is not null)`,
    ),
  ],
);

export const journalLine = pgTable(
  "journal_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => journalEntry.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartAccount.id),
    debit: numeric("debit", { precision: 18, scale: 2 }).notNull().default("0"),
    credit: numeric("credit", { precision: 18, scale: 2 }).notNull().default("0"),
    description: text("description"),
  },
  (t) => [
    unique("journal_line_order").on(t.entryId, t.lineNo),
    check("journal_line_one_side", sql`(${t.debit} > 0 and ${t.credit} = 0) or (${t.credit} > 0 and ${t.debit} = 0)`),
  ],
);

// The last Document Number given per Company, Document Type and year. Taking
// the next one locks the row until the Posting commits, so numbers stay gap-free.
export const documentSequence = pgTable(
  "document_sequence",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => company.id),
    documentType: documentTypeEnum("document_type").notNull(),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.documentType, t.year] })],
);

// A closed Accounting Period: no Posting may be dated inside `period` (the
// month's first day). A trigger in the migration enforces it. Reopening deletes the row.
export const periodClose = pgTable(
  "period_close",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => company.id),
    period: date("period", { mode: "string" }).notNull(),
    closedBy: text("closed_by").references(() => user.id, { onDelete: "set null" }),
    closedAt: timestamp("closed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.period] }),
    check("period_close_first_of_month", sql`extract(day from ${t.period}) = 1`),
  ],
);
