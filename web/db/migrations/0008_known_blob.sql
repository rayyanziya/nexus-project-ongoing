DROP INDEX "documents_status_idx";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "body";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "deleted_at";--> statement-breakpoint
DROP TYPE "public"."document_status";