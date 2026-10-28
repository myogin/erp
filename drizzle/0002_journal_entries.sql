CREATE TYPE "public"."document_type" AS ENUM('JV');--> statement-breakpoint
CREATE TYPE "public"."journal_status" AS ENUM('draft', 'posted');--> statement-breakpoint
CREATE TABLE "document_sequence" (
	"company_id" uuid NOT NULL,
	"document_type" "document_type" NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer NOT NULL,
	CONSTRAINT "document_sequence_company_id_document_type_year_pk" PRIMARY KEY("company_id","document_type","year")
);
--> statement-breakpoint
CREATE TABLE "journal_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_type" "document_type" NOT NULL,
	"status" "journal_status" DEFAULT 'draft' NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"year" integer,
	"sequence" integer,
	"document_number" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"posted_by" text,
	"posted_at" timestamp with time zone,
	CONSTRAINT "journal_entry_sequence" UNIQUE("company_id","document_type","year","sequence"),
	CONSTRAINT "journal_entry_document_number" UNIQUE("company_id","document_number"),
	CONSTRAINT "journal_entry_numbered_when_posted" CHECK (("journal_entry"."status" = 'posted') = ("journal_entry"."document_number" is not null and "journal_entry"."year" is not null and "journal_entry"."sequence" is not null and "journal_entry"."posted_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "journal_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"description" text,
	CONSTRAINT "journal_line_order" UNIQUE("entry_id","line_no"),
	CONSTRAINT "journal_line_one_side" CHECK (("journal_line"."debit" > 0 and "journal_line"."credit" = 0) or ("journal_line"."credit" > 0 and "journal_line"."debit" = 0))
);
--> statement-breakpoint
ALTER TABLE "document_sequence" ADD CONSTRAINT "document_sequence_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_posted_by_user_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_entry_id_journal_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_account_id_chart_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ADR-0003: a posted Journal Entry can never be changed or deleted.
CREATE FUNCTION "journal_entry_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'journal entry % is posted and cannot be changed', OLD.id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "journal_entry_immutable" BEFORE UPDATE OR DELETE ON "journal_entry" FOR EACH ROW EXECUTE FUNCTION "journal_entry_immutable"();
--> statement-breakpoint
-- Nor can the lines of a posted Journal Entry, including adding new ones.
CREATE FUNCTION "journal_line_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (SELECT 1 FROM journal_entry WHERE id = OLD.entry_id AND status = 'posted') THEN
    RAISE EXCEPTION 'journal entry % is posted; its lines cannot be changed', OLD.entry_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (SELECT 1 FROM journal_entry WHERE id = NEW.entry_id AND status = 'posted') THEN
    RAISE EXCEPTION 'journal entry % is posted; its lines cannot be changed', NEW.entry_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "journal_line_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "journal_line" FOR EACH ROW EXECUTE FUNCTION "journal_line_immutable"();
--> statement-breakpoint
-- ADR-0003: debits equal credits, enforced by the database. Checked when an
-- entry is posted, at commit, against its lines: at least two, balanced and
-- non-zero, on non-header Accounts of the entry's own Company.
CREATE FUNCTION "journal_entry_balanced"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  total_debit numeric;
  total_credit numeric;
  line_count integer;
BEGIN
  SELECT coalesce(sum(debit), 0), coalesce(sum(credit), 0), count(*)
    INTO total_debit, total_credit, line_count
    FROM journal_line WHERE entry_id = NEW.id;
  IF line_count < 2 OR total_debit <> total_credit OR total_debit = 0 THEN
    RAISE EXCEPTION 'journal entry % does not balance (debit %, credit %, % lines)', NEW.id, total_debit, total_credit, line_count;
  END IF;
  IF EXISTS (
    SELECT 1 FROM journal_line l JOIN chart_account a ON a.id = l.account_id
    WHERE l.entry_id = NEW.id AND (a.company_id <> NEW.company_id OR a.is_header)
  ) THEN
    RAISE EXCEPTION 'journal entry % posts to a header Account or another Company''s Account', NEW.id;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "journal_entry_balanced" AFTER INSERT OR UPDATE ON "journal_entry" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.status = 'posted') EXECUTE FUNCTION "journal_entry_balanced"();
