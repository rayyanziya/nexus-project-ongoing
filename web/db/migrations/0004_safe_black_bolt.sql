CREATE TYPE "public"."comment_author_type" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"author_type" "comment_author_type" NOT NULL,
	"author_admin_id" text,
	"author_client_user_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "post_comments_author_union" CHECK (("post_comments"."author_type" = 'admin' AND "post_comments"."author_admin_id" IS NOT NULL AND "post_comments"."author_client_user_id" IS NULL)
       OR ("post_comments"."author_type" = 'client' AND "post_comments"."author_client_user_id" IS NOT NULL AND "post_comments"."author_admin_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "project_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_admin_id" text NOT NULL,
	"body" text,
	"for_ai_context" boolean DEFAULT false NOT NULL,
	"client_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "project_files" ADD COLUMN "post_id" uuid;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_project_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."project_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_client_user_id_client_users_id_fk" FOREIGN KEY ("author_client_user_id") REFERENCES "public"."client_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_posts" ADD CONSTRAINT "project_posts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_comments_post_created_idx" ON "post_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_comments_parent_idx" ON "post_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "project_posts_project_created_idx" ON "project_posts" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_posts_project_visible_idx" ON "project_posts" USING btree ("project_id","client_visible");--> statement-breakpoint
CREATE INDEX "project_posts_project_ai_idx" ON "project_posts" USING btree ("project_id","for_ai_context");--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_post_id_project_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."project_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_files_post_idx" ON "project_files" USING btree ("post_id");