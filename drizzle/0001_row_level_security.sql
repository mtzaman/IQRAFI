-- Defense in depth: enable row-level security on every application table.
-- IQRAFI's server connects as the table owner (which bypasses RLS) and performs all
-- authorization checks in its service layer. With RLS enabled and no permissive policies,
-- any other role (e.g. Supabase's `anon` / `authenticated` roles exposed through PostgREST)
-- cannot read or write application data directly.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "khatmas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignment_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reading_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dedications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "global_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Qur'an reference data is public and read-only.
ALTER TABLE "surahs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "juz" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ayahs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "quran_surahs_read" ON "surahs" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "quran_juz_read" ON "juz" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "quran_ayahs_read" ON "ayahs" FOR SELECT USING (true);
