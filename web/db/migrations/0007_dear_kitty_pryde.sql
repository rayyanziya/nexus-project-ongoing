CREATE TYPE "public"."document_status" AS ENUM('draft', 'issued', 'void');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_type" text NOT NULL,
	"project_id" uuid,
	"document_number" text,
	"title" text NOT NULL,
	"body" text,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp with time zone,
	"created_by_admin_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_number_idx" ON "documents" USING btree ("document_number");--> statement-breakpoint
CREATE INDEX "documents_type_idx" ON "documents" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "documents_project_idx" ON "documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");