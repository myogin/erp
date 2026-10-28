CREATE TABLE "period_close" (
	"company_id" uuid NOT NULL,
	"period" date NOT NULL,
	"closed_by" text,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "period_close_company_id_period_pk" PRIMARY KEY("company_id","period"),
	CONSTRAINT "period_close_first_of_month" CHECK (extract(day from "period_close"."period") = 1)
);
--> statement-breakpoint
ALTER TABLE "journal_entry" ADD COLUMN "reverses_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "period_close" ADD CONSTRAINT "period_close_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period_close" ADD CONSTRAINT "period_close_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reverses_entry_id_journal_entry_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."journal_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reversed_once" UNIQUE("reverses_entry_id");--> statement-breakpoint
-- ADR-0003: a closed Accounting Period rejects any new Posting dated inside it,
-- whatever posts it (manual entries, Reversals, Payroll Runs).
CREATE FUNCTION "journal_entry_period_open"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM period_close
    WHERE company_id = NEW.company_id AND period = date_trunc('month', NEW.date)::date
  ) THEN
    RAISE EXCEPTION 'journal entry % is dated in closed period %', NEW.id, to_char(NEW.date, 'YYYY-MM');
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "journal_entry_period_open" BEFORE INSERT OR UPDATE ON "journal_entry" FOR EACH ROW WHEN (NEW.status = 'posted') EXECUTE FUNCTION "journal_entry_period_open"();
