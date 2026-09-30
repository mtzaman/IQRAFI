/**
 * Shared input schemas. Every server action and API route validates with these;
 * client forms may reuse them for instant feedback, but the server is authoritative.
 */
import { z } from "zod";
import { DEDICATION_TYPES, DEDICATION_VISIBILITIES, SCHEDULES } from "@/lib/db/schema";
import { isValidTimezone } from "@/lib/khatma/schedule";

// Strip control characters (except newlines/tabs) and trim. Output is always rendered escaped by React.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
const text = (max: number) => z.string().transform(clean).pipe(z.string().max(max));
const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : clean(v) || null))
    .pipe(z.string().max(max).nullable());

export const timezoneSchema = z.string().max(64).refine(isValidTimezone, "invalid_timezone");
export const localeSchema = z.enum(["en", "ar", "ur"]);
export const uuidSchema = z.uuid();
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date");

export const emailSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.email().max(254));
export const passwordSchema = z.string().min(8, "password_too_short").max(128, "password_too_long");

export const signupSchema = z.object({
  name: optionalText(80),
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const createGroupSchema = z
  .object({
    name: text(80).pipe(z.string().min(1, "name_required")),
    description: optionalText(280),
    schedule: z.enum(SCHEDULES),
    customDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
    startDate: isoDateSchema.optional().nullable(),
    timezone: timezoneSchema,
    assignmentMode: z.enum(["automatic", "manual"]).default("automatic"),
    recurring: z.boolean().default(true),
    rotate: z.boolean().default(true),
    kind: z.enum(["standard", "ramadan"]).default("standard"),
  })
  .refine((v) => v.schedule !== "custom" || v.customDays != null, { message: "custom_days_required", path: ["customDays"] });
export type CreateGroupInput = z.input<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  name: text(80).pipe(z.string().min(1, "name_required")).optional(),
  description: optionalText(280),
  schedule: z.enum(SCHEDULES).optional(),
  customDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  timezone: timezoneSchema.optional(),
  assignmentMode: z.enum(["automatic", "manual"]).optional(),
  recurring: z.boolean().optional(),
  rotate: z.boolean().optional(),
});
export type UpdateGroupInput = z.input<typeof updateGroupSchema>;

export const invitationSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  maxUses: z.coerce.number().int().min(1).max(10_000).optional().nullable(),
});

export const dedicationSchema = z
  .object({
    type: z.enum(DEDICATION_TYPES),
    name: optionalText(120),
    message: optionalText(500),
    visibility: z.enum(DEDICATION_VISIBILITIES).default("private"),
    confirmPublic: z.boolean().default(false),
  })
  .refine((v) => v.visibility !== "public" || v.confirmPublic, { message: "public_confirmation_required", path: ["confirmPublic"] });
export type DedicationInput = z.input<typeof dedicationSchema>;

export const profileSchema = z.object({
  name: optionalText(80),
  language: localeSchema,
  timezone: timezoneSchema,
  country: optionalText(56),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => v || null)
    .refine((v) => v == null || /^https:\/\//.test(v), "avatar_https"),
});

export const preferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  readerTheme: z.enum(["light", "dark", "sepia"]),
  readerFontScale: z.coerce.number().int().min(70).max(200),
  showTranslation: z.boolean(),
  analyticsConsent: z.boolean(),
  notificationPrefs: z.object({
    inApp: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    assignmentReady: z.boolean(),
    groupProgress: z.boolean(),
    khatmaCompleted: z.boolean(),
    helpRequests: z.boolean(),
  }),
});

export const reportSchema = z.object({
  targetType: z.enum(["group", "dedication", "user"]),
  targetId: uuidSchema,
  reason: z.enum(["inappropriate", "spam", "abuse", "other"]),
  details: optionalText(1000),
});

export const readingPositionSchema = z.object({ ayahId: z.number().int().min(1).max(6236) });
