/**
 * Anonymised product analytics. Events are recorded only when the user has consented,
 * never include a user identifier, and exist solely to improve the product.
 */
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";

export const ANALYTICS_EVENTS = [
  "onboarding_started",
  "onboarding_completed",
  "group_created",
  "group_joined",
  "juz_started",
  "juz_completed",
  "khatma_completed",
  "dedication_created",
  "invitation_sent",
  "invitation_accepted",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export async function track(event: AnalyticsEvent, consent: boolean, properties: Record<string, string | number | boolean> = {}) {
  if (!consent) return;
  try {
    await db.insert(analyticsEvents).values({ name: event, properties });
  } catch {
    // Analytics must never break a user action.
  }
}
