/**
 * Gentle, preference-aware notifications.
 *
 * Every notification is stored in-app. External channels (email, push) are pluggable
 * adapters so native apps and email providers can be added without touching callers.
 * Copy lives in the i18n dictionaries under `notifications.*` and is deliberately warm:
 * no urgency, no guilt, no pressure.
 */
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/lib/db";
import { notifications, users, type NotificationPrefs, type NotificationType } from "@/lib/db/schema";

type Data = Record<string, string | number | null>;

const PREF_FOR_TYPE: Record<NotificationType, keyof NotificationPrefs | null> = {
  assignment_ready: "assignmentReady",
  group_progress: "groupProgress",
  khatma_completed: "khatmaCompleted",
  help_requested: "helpRequests",
  juz_available: "helpRequests",
  member_joined: null,
  member_left: null,
  assignment_taken_over: null,
};

export interface DeliveryAdapter {
  channel: "email" | "push";
  deliver(userId: string, type: NotificationType, data: Data): Promise<void>;
}

const adapters: DeliveryAdapter[] = [];
/** Register an external delivery channel (e.g. an email provider or push service). */
export function registerDeliveryAdapter(adapter: DeliveryAdapter) {
  adapters.push(adapter);
}

export async function notify(tx: DbOrTx, userIds: readonly string[], type: NotificationType, data: Data = {}) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  const recipients = await tx.select({ id: users.id, prefs: users.notificationPrefs }).from(users).where(inArray(users.id, ids));
  const pref = PREF_FOR_TYPE[type];
  const allowed = recipients.filter((r) => r.prefs.inApp !== false && (pref === null || r.prefs[pref] !== false));
  if (allowed.length === 0) return;
  await tx.insert(notifications).values(allowed.map((r) => ({ userId: r.id, type, data })));
  for (const r of allowed) {
    for (const adapter of adapters) {
      if (r.prefs[adapter.channel]) void adapter.deliver(r.id, type, data).catch(() => undefined);
    }
  }
}

export async function listNotifications(userId: string, limit = 50) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
