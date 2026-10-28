CREATE TYPE "public"."account_type" AS ENUM('CASH_BANK', 'ACCOUNT_RECEIVABLE', 'INVENTORY', 'OTHER_CURRENT_ASSET', 'FIXED_ASSET', 'ACCUMULATED_DEPRECIATION', 'ACCOUNT_PAYABLE', 'OTHER_CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE');--> statement-breakpoint
CREATE TABLE "chart_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"parent_id" uuid,
	"from_template" boolean NOT NULL,
	"is_header" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chart_account_code_per_company" UNIQUE("company_id","code"),
	CONSTRAINT "chart_account_code_format" CHECK ("chart_account"."code" ~ '^[0-9]{4}([0-9]{2})*$'),
	CONSTRAINT "chart_account_sub_account_code" CHECK ("chart_account"."from_template" or ("chart_account"."parent_id" is not null and right("chart_account"."code", 2)::int between 50 and 99))
);
--> statement-breakpoint
ALTER TABLE "chart_account" ADD CONSTRAINT "chart_account_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_account" ADD CONSTRAINT "chart_account_parent_id_chart_account_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chart_account"("id") ON DELETE no action ON UPDATE no action;