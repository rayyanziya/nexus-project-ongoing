CREATE TYPE "public"."notification_kind" AS ENUM('post_created', 'comment_created');--> statement-breakpoint
CREATE TYPE "public"."notification_recipient_type" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_type" "notification_recipient_type" NOT NULL,
	"recipient_admin_id" text,
	"recipient_client_user_id" uuid,
	"kind" "notification_kind" NOT NULL,
	"project_id" uuid NOT NULL,
	"post_id" uuid,
	"comment_id" uuid,
	"actor_admin_id" text,
	"actor_client_user_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_recipient_union" CHECK (("notifications"."recipient_type" = 'admin' AND "notifications"."recipient_admin_id" IS NOT NULL AND "notifications"."recipient_client_user_id" IS NULL)
       OR ("notifications"."recipient_type" = 'client' AND "notifications"."recipient_client_user_id" IS NOT NULL AND "notifications"."recipient_admin_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_client_user_id_client_users_id_fk" FOREIGN KEY ("recipient_client_user_id") REFERENCES "public"."client_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_project_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."project_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_client_user_id_client_users_id_fk" FOREIGN KEY ("actor_client_user_id") REFERENCES "public"."client_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_client_unread_idx" ON "notifications" USING btree ("recipient_client_user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "notifications_admin_unread_idx" ON "notifications" USING btree ("recipient_admin_id","read_at","created_at");