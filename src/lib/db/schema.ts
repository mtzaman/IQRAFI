/**
 * IQRAFI relational schema (PostgreSQL).
 *
 * Conventions:
 *  - All timestamps are stored in UTC (`timestamptz`). Calendar dates that belong to a
 *    group (khatma start/due dates) are stored as `date` in the group's timezone.
 *  - Integrity rules that must never be violated (one row per Juz per Khatma, one active
 *    Khatma per group, one membership per user per group) are enforced by the database.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Qur'an reference data (seeded from the verified dataset)           */
/* ------------------------------------------------------------------ */

export const surahs = pgTable("surahs", {
  number: smallint("number").primaryKey(),
  nameArabic: text("name_arabic").notNull(),
  nameTransliteration: text("name_transliteration").notNull(),
  nameEnglish: text("name_english").notNull(),
  revelation: text("revelation", { enum: ["meccan", "medinan"] }).notNull(),
  ayahCount: smallint("ayah_count").notNull(),
});

export const juz = pgTable("juz", {
  number: smallint("number").primaryKey(),
  firstAyahId: integer("first_ayah_id").notNull(),
  lastAyahId: integer("last_ayah_id").notNull(),
  ayahCount: smallint("ayah_count").notNull(),
  metadata: jsonb("metadata").$type<{ start: { surah: number; ayah: number }; end: { surah: number; ayah: number } }>().notNull(),
});

export const ayahs = pgTable(
  "ayahs",
  {
    id: integer("id").primaryKey(),
    surah: smallint("surah")
      .notNull()
      .references(() => surahs.number),
    ayah: smallint("ayah").notNull(),
    text: text("text").notNull(),
    translationEn: text("translation_en").notNull(),
    juz: smallint("juz")
      .notNull()
      .references(() => juz.number),
    hizbQuarter: smallint("hizb_quarter").notNull(),
    page: smallint("page").notNull(),
    sajda: boolean("sajda").notNull().default(false),
  },
  (t) => [uniqueIndex("ayahs_surah_ayah_idx").on(t.surah, t.ayah), index("ayahs_juz_idx").on(t.juz), index("ayahs_page_idx").on(t.page)],
);

/* ------------------------------------------------------------------ */
/* Accounts & authentication                                          */
/* ------------------------------------------------------------------ */

export type NotificationPrefs = {
  inApp: boolean;
  email: boolean;
  push: boolean;
  assignmentReady: boolean;
  groupProgress: boolean;
  khatmaCompleted: boolean;
  helpRequests: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  inApp: true,
  email: false,
  push: false,
  assignmentReady: true,
  groupProgress: true,
  khatmaCompleted: true,
  helpRequests: true,
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash"),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    language: text("language", { enum: ["en", "ar", "ur"] }).notNull().default("en"),
    timezone: text("timezone").notNull().default("UTC"),
    country: text("country"),
    theme: text("theme", { enum: ["system", "light", "dark"] }).notNull().default("system"),
    readerTheme: text("reader_theme", { enum: ["light", "dark", "sepia"] }).notNull().default("light"),
    readerFontScale: smallint("reader_font_scale").notNull().default(100),
    showTranslation: boolean("show_translation").notNull().default(false),
    notificationPrefs: jsonb("notification_prefs").$type<NotificationPrefs>().notNull().default(DEFAULT_NOTIFICATION_PREFS),
    analyticsConsent: boolean("analytics_consent").notNull().default(false),
    lastReadAyahId: integer("last_read_ayah_id").references(() => ayahs.id),
    status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
    /** Platform-level role for the internal admin dashboard. Granted only via `npm run admin:grant`. */
    platformRole: text("platform_role", { enum: ["user", "admin"] }).notNull().default("user"),
    isDemo: boolean("is_demo").notNull().default(false),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: text("provider", { enum: ["google", "apple"] }).notNull(),
    providerUserId: text("provider_user_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerUserId] }), index("oauth_accounts_user_idx").on(t.userId)],
);

/** Session ids are SHA-256 hashes of the random token held in the cookie; raw tokens are never stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Groups, Khatmas and assignments                                    */
/* ------------------------------------------------------------------ */

export const SCHEDULES = ["daily", "every_2_days", "every_3_days", "weekly", "custom"] as const;
export type Schedule = (typeof SCHEDULES)[number];
export const GROUP_ROLES = ["owner", "admin", "member"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    timezone: text("timezone").notNull().default("UTC"),
    schedule: text("schedule", { enum: SCHEDULES }).notNull().default("weekly"),
    /** Number of days allotted to each Khatma cycle (derived from schedule, or custom). */
    cycleDays: smallint("cycle_days").notNull().default(7),
    assignmentMode: text("assignment_mode", { enum: ["automatic", "manual"] }).notNull().default("automatic"),
    /** When true, a new Khatma cycle starts automatically (with rotation) after each completion. */
    recurring: boolean("recurring").notNull().default(true),
    rotate: boolean("rotate").notNull().default(true),
    kind: text("kind", { enum: ["standard", "ramadan"] }).notNull().default("standard"),
    /** Preferred start date (group timezone) for the first Khatma. */
    startDate: date("start_date"),
    status: text("status", { enum: ["active", "archived", "deleted"] }).notNull().default("active"),
    isDemo: boolean("is_demo").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("groups_cycle_days_check", sql`${t.cycleDays} between 1 and 365`)],
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: GROUP_ROLES }).notNull().default("member"),
    status: text("status", { enum: ["active", "left", "removed"] }).notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("group_members_group_user_idx").on(t.groupId, t.userId),
    index("group_members_user_idx").on(t.userId),
  ],
);

export const khatmas = pgTable(
  "khatmas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    cycleNumber: integer("cycle_number").notNull(),
    status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull().default("active"),
    /** Calendar dates in the group's timezone. */
    startDate: date("start_date").notNull(),
    dueDate: date("due_date").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("khatmas_group_cycle_idx").on(t.groupId, t.cycleNumber),
    // At most one active Khatma per group.
    uniqueIndex("khatmas_one_active_idx").on(t.groupId).where(sql`${t.status} = 'active'`),
    index("khatmas_status_idx").on(t.status),
  ],
);

export const ASSIGNMENT_STATUSES = ["pending", "in_progress", "completed"] as const;

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    khatmaId: uuid("khatma_id")
      .notNull()
      .references(() => khatmas.id, { onDelete: "cascade" }),
    juzNumber: smallint("juz_number")
      .notNull()
      .references(() => juz.number),
    /** Current reader. NULL means the Juz is in the group's available pool. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Reader assigned when the Khatma was created (kept for takeover history). */
    originalUserId: uuid("original_user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status", { enum: ASSIGNMENT_STATUSES }).notNull().default("pending"),
    progress: smallint("progress").notNull().default(0),
    lastAyahId: integer("last_ayah_id").references(() => ayahs.id),
    helpRequestedAt: timestamp("help_requested_at", { withTimezone: true }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Each Juz appears exactly once per Khatma: never omitted, never duplicated.
    uniqueIndex("assignments_khatma_juz_idx").on(t.khatmaId, t.juzNumber),
    index("assignments_user_idx").on(t.userId),
    index("assignments_completed_at_idx").on(t.completedAt),
    check("assignments_juz_check", sql`${t.juzNumber} between 1 and 30`),
    check("assignments_progress_check", sql`${t.progress} between 0 and 100`),
  ],
);

/** Audit trail for assignment ownership changes (volunteer takeovers, releases, reassignments). */
export const assignmentEvents = pgTable(
  "assignment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["assigned", "claimed", "volunteered", "released", "reassigned", "help_requested", "completed"],
    }).notNull(),
    fromUserId: uuid("from_user_id").references(() => users.id, { onDelete: "set null" }),
    toUserId: uuid("to_user_id").references(() => users.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("assignment_events_assignment_idx").on(t.assignmentId)],
);

/** A user's reading position within each Juz (personal history; also drives assignment progress). */
export const readingProgress = pgTable(
  "reading_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    juzNumber: smallint("juz_number")
      .notNull()
      .references(() => juz.number),
    ayahId: integer("ayah_id")
      .notNull()
      .references(() => ayahs.id),
    progress: smallint("progress").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("reading_progress_user_juz_idx").on(t.userId, t.juzNumber)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invitations_token_idx").on(t.token), index("invitations_group_idx").on(t.groupId)],
);

/* ------------------------------------------------------------------ */
/* Dedications, bookmarks, notifications                              */
/* ------------------------------------------------------------------ */

export const DEDICATION_TYPES = ["myself", "parents", "family", "in_memory", "loved_one", "community", "other"] as const;
export type DedicationType = (typeof DEDICATION_TYPES)[number];
export const DEDICATION_VISIBILITIES = ["private", "group", "public"] as const;
export type DedicationVisibility = (typeof DEDICATION_VISIBILITIES)[number];

export const dedications = pgTable(
  "dedications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    khatmaId: uuid("khatma_id")
      .notNull()
      .references(() => khatmas.id, { onDelete: "cascade" }),
    type: text("type", { enum: DEDICATION_TYPES }).notNull(),
    name: text("name"),
    message: text("message"),
    visibility: text("visibility", { enum: DEDICATION_VISIBILITIES }).notNull().default("private"),
    /** Set only when the user explicitly confirmed making the dedication public. */
    publicConfirmedAt: timestamp("public_confirmed_at", { withTimezone: true }),
    hiddenByModeratorAt: timestamp("hidden_by_moderator_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("dedications_user_khatma_idx").on(t.userId, t.khatmaId),
    index("dedications_khatma_idx").on(t.khatmaId),
    check("dedications_public_confirmed_check", sql`${t.visibility} <> 'public' or ${t.publicConfirmedAt} is not null`),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ayahId: integer("ayah_id")
      .notNull()
      .references(() => ayahs.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("bookmarks_user_ayah_idx").on(t.userId, t.ayahId)],
);

export const NOTIFICATION_TYPES = [
  "assignment_ready",
  "group_progress",
  "khatma_completed",
  "help_requested",
  "juz_available",
  "member_joined",
  "member_left",
  "assignment_taken_over",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    data: jsonb("data").$type<Record<string, string | number | null>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Moderation                                                         */
/* ------------------------------------------------------------------ */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type", { enum: ["group", "dedication", "user"] }).notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason", { enum: ["inappropriate", "spam", "abuse", "other"] }).notNull(),
    details: text("details"),
    status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("reports_status_idx").on(t.status)],
);

export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

/* ------------------------------------------------------------------ */
/* Aggregate statistics & analytics                                   */
/* ------------------------------------------------------------------ */

/** Live global counters, incremented transactionally and reconciled by the scheduled refresh job. */
export const globalCounters = pgTable("global_counters", {
  key: text("key").primaryKey(),
  value: bigint("value", { mode: "number" }).notNull().default(0),
  updatedAt: updatedAt(),
});

/** Per-UTC-day aggregate counts (for "today" figures and future trends). */
export const dailyStats = pgTable("daily_stats", {
  day: date("day").primaryKey(),
  juzCompleted: integer("juz_completed").notNull().default(0),
  khatmasCompleted: integer("khatmas_completed").notNull().default(0),
});

/** Anonymised product analytics: no user id, only recorded with consent. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    properties: jsonb("properties").$type<Record<string, string | number | boolean>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("analytics_events_name_created_idx").on(t.name, t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
