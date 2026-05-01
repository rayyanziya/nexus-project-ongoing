CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_holder_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "bank_account_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "bank_name_snapshot" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "account_number_snapshot" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "account_holder_name_snapshot" text;--> statement-breakpoint
CREATE INDEX "bank_accounts_active_idx" ON "bank_accounts" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_bank_account_idx" ON "invoices" USING btree ("bank_account_id");