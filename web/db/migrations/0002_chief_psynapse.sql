CREATE TABLE "document_sequences" (
	"year" integer NOT NULL,
	"doc_type" text NOT NULL,
	"project_code" text NOT NULL,
	"last_value" integer NOT NULL,
	CONSTRAINT "document_sequences_year_doc_type_project_code_pk" PRIMARY KEY("year","doc_type","project_code")
);
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "invoice_number" DROP NOT NULL;--> statement-breakpoint
DELETE FROM "projects" WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "code" text;--> statement-breakpoint
UPDATE "projects" SET "code" = upper(left(regexp_replace("name", '[^A-Za-z]', '', 'g'), 3)) WHERE "code" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_code_idx" ON "projects" USING btree ("code");
