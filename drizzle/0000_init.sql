CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"khatma_id" uuid NOT NULL,
	"juz_number" smallint NOT NULL,
	"user_id" uuid,
	"original_user_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" smallint DEFAULT 0 NOT NULL,
	"last_ayah_id" integer,
	"help_requested_at" timestamp with time zone,
	"assigned_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_juz_check" CHECK ("assignments"."juz_number" between 1 and 30),
	CONSTRAINT "assignments_progress_check" CHECK ("assignments"."progress" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "ayahs" (
	"id" integer PRIMARY KEY NOT NULL,
	"surah" smallint NOT NULL,
	"ayah" smallint NOT NULL,
	"text" text NOT NULL,
	"translation_en" text NOT NULL,
	"juz" smallint NOT NULL,
	"hizb_quarter" smallint NOT NULL,
	"page" smallint NOT NULL,
	"sajda" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ayah_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"day" date PRIMARY KEY NOT NULL,
	"juz_completed" integer DEFAULT 0 NOT NULL,
	"khatmas_completed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dedications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"khatma_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text,
	"message" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"public_confirmed_at" timestamp with time zone,
	"hidden_by_moderator_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dedications_public_confirmed_check" CHECK ("dedications"."visibility" <> 'public' or "dedications"."public_confirmed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "global_counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" uuid,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"schedule" text DEFAULT 'weekly' NOT NULL,
	"cycle_days" smallint DEFAULT 7 NOT NULL,
	"assignment_mode" text DEFAULT 'automatic' NOT NULL,
	"recurring" boolean DEFAULT true NOT NULL,
	"rotate" boolean DEFAULT true NOT NULL,
	"kind" text DEFAULT 'standard' NOT NULL,
	"start_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_cycle_days_check" CHECK ("groups"."cycle_days" between 1 and 365)
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"created_by" uuid,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "juz" (
	"number" smallint PRIMARY KEY NOT NULL,
	"first_ayah_id" integer NOT NULL,
	"last_ayah_id" integer NOT NULL,
	"ayah_count" smallint NOT NULL,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "khatmas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"due_date" date NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_provider_user_id_pk" PRIMARY KEY("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"juz_number" smallint NOT NULL,
	"ayah_id" integer NOT NULL,
	"progress" smallint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surahs" (
	"number" smallint PRIMARY KEY NOT NULL,
	"name_arabic" text NOT NULL,
	"name_transliteration" text NOT NULL,
	"name_english" text NOT NULL,
	"revelation" text NOT NULL,
	"ayah_count" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text,
	"name" text,
	"avatar_url" text,
	"language" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"country" text,
	"theme" text DEFAULT 'system' NOT NULL,
	"reader_theme" text DEFAULT 'light' NOT NULL,
	"reader_font_scale" smallint DEFAULT 100 NOT NULL,
	"show_translation" boolean DEFAULT false NOT NULL,
	"notification_prefs" jsonb DEFAULT '{"inApp":true,"email":false,"push":false,"assignmentReady":true,"groupProgress":true,"khatmaCompleted":true,"helpRequests":true}'::jsonb NOT NULL,
	"analytics_consent" boolean DEFAULT false NOT NULL,
	"last_read_ayah_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"platform_role" text DEFAULT 'user' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_khatma_id_khatmas_id_fk" FOREIGN KEY ("khatma_id") REFERENCES "public"."khatmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_juz_number_juz_number_fk" FOREIGN KEY ("juz_number") REFERENCES "public"."juz"("number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_original_user_id_users_id_fk" FOREIGN KEY ("original_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_last_ayah_id_ayahs_id_fk" FOREIGN KEY ("last_ayah_id") REFERENCES "public"."ayahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayahs" ADD CONSTRAINT "ayahs_surah_surahs_number_fk" FOREIGN KEY ("surah") REFERENCES "public"."surahs"("number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayahs" ADD CONSTRAINT "ayahs_juz_juz_number_fk" FOREIGN KEY ("juz") REFERENCES "public"."juz"("number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_ayah_id_ayahs_id_fk" FOREIGN KEY ("ayah_id") REFERENCES "public"."ayahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedications" ADD CONSTRAINT "dedications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedications" ADD CONSTRAINT "dedications_khatma_id_khatmas_id_fk" FOREIGN KEY ("khatma_id") REFERENCES "public"."khatmas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "khatmas" ADD CONSTRAINT "khatmas_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_juz_number_juz_number_fk" FOREIGN KEY ("juz_number") REFERENCES "public"."juz"("number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_ayah_id_ayahs_id_fk" FOREIGN KEY ("ayah_id") REFERENCES "public"."ayahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_last_read_ayah_id_ayahs_id_fk" FOREIGN KEY ("last_read_ayah_id") REFERENCES "public"."ayahs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_name_created_idx" ON "analytics_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "assignment_events_assignment_idx" ON "assignment_events" USING btree ("assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_khatma_juz_idx" ON "assignments" USING btree ("khatma_id","juz_number");--> statement-breakpoint
CREATE INDEX "assignments_user_idx" ON "assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assignments_completed_at_idx" ON "assignments" USING btree ("completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ayahs_surah_ayah_idx" ON "ayahs" USING btree ("surah","ayah");--> statement-breakpoint
CREATE INDEX "ayahs_juz_idx" ON "ayahs" USING btree ("juz");--> statement-breakpoint
CREATE INDEX "ayahs_page_idx" ON "ayahs" USING btree ("page");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_ayah_idx" ON "bookmarks" USING btree ("user_id","ayah_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dedications_user_khatma_idx" ON "dedications" USING btree ("user_id","khatma_id");--> statement-breakpoint
CREATE INDEX "dedications_khatma_idx" ON "dedications" USING btree ("khatma_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_group_user_idx" ON "group_members" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_group_idx" ON "invitations" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "khatmas_group_cycle_idx" ON "khatmas" USING btree ("group_id","cycle_number");--> statement-breakpoint
CREATE UNIQUE INDEX "khatmas_one_active_idx" ON "khatmas" USING btree ("group_id") WHERE "khatmas"."status" = 'active';--> statement-breakpoint
CREATE INDEX "khatmas_status_idx" ON "khatmas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_user_juz_idx" ON "reading_progress" USING btree ("user_id","juz_number");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));