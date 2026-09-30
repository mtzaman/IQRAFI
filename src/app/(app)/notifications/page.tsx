import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/i18n/config";
import { notificationText } from "@/components/app/notification-text";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { listNotifications } from "@/server/services/notifications";
import { MarkAllRead } from "./MarkAllRead";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.notifications.title };
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const items = await listNotifications(user.id);
  const unread = items.some((n) => !n.readAt);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.notifications.title}</h1>
        {unread ? <MarkAllRead /> : null}
      </header>
      {items.length === 0 ? (
        <EmptyState icon="bell" title={t.notifications.empty} />
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const href = n.type === "khatma_completed" && n.data.khatmaId ? `/khatma/${n.data.khatmaId}` : n.data.groupId ? `/groups/${n.data.groupId}` : "/home";
              return (
                <li key={n.id}>
                  <Link href={href} className="flex gap-3 px-5 py-4 hover:bg-surface-2">
                    <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent"}`} />
                    <span className="min-w-0">
                      <span className={`block ${n.readAt ? "" : "font-medium"}`}>{notificationText(t, n.type, n.data)}</span>
                      <span className="mt-0.5 block text-xs text-muted">{formatDate(locale, n.createdAt, user.timezone, "medium")}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
