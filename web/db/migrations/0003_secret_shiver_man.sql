CREATE TABLE "conversation_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"r2_key" text NOT NULL,
	"file_size" bigint NOT NULL,
	"anthropic_file_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_files" ADD COLUMN "anthropic_file_id" text;--> statement-breakpoint
ALTER TABLE "project_conversations" ADD COLUMN "container_id" text;--> statement-breakpoint
ALTER TABLE "conversation_outputs" ADD CONSTRAINT "conversation_outputs_conversation_id_project_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."project_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_outputs" ADD CONSTRAINT "conversation_outputs_message_id_project_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."project_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_outputs_message_idx" ON "conversation_outputs" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "conversation_outputs_conv_idx" ON "conversation_outputs" USING btree ("conversation_id");