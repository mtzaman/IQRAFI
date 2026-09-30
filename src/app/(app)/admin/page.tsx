import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate, formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { adminOverview, listReports } from "@/server/services/moderation";
import { RefreshStatsButton, ReportActions, SuspendButton } from "./AdminActions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

/** Internal dashboard. Access requires platform_role = 'admin' (granted only via the CLI). */
export default async function AdminPage() {
  const user = await requireUser();
  if (user.platformRole !== "admin") notFound();
  const { t, locale } = await getI18n();
  const [overview, reports] = await Promise.all([adminOverview(user.id), listReports(user.id)]);
  const figures = [
    { label: t.admin.users, value: overview.usersTotal },
    { label: t.admin.newUsers, value: overview.usersNew7d },
    { label: t.admin.activeGroups, value: overview.groupsActive },
    { label: t.admin.activeKhatmas, value: overview.khatmasActive },
    { label: t.admin.completedKhatmas, value: overview.khatmasCompleted },
    { label: t.admin.openReports, value: overview.reportsOpen },
  ];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.admin.title}</h1>
        <RefreshStatsButton />
      </header>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {figures.map((f) => (
          <Card key={f.label} as="div" className="p-4 sm:p-4">
            <dt className="text-sm text-muted">{f.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(locale, f.value)}</dd>
          </Card>
        ))}
      </dl>
      <Card>
        <CardTitle>{t.admin.health}</CardTitle>
        <p className="mt-2 text-sm">
          <Badge tone="primary">{t.admin.healthy}</Badge> <span className="ms-2 text-muted">{t.admin.dbTime}: {overview.dbTime}</span>
        </p>
      </Card>
      <Card>
        <CardTitle>{t.admin.reports}</CardTitle>
        {reports.length ? (
          <ul className="mt-3 divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="space-y-2 py-3">
                <p className="text-sm">
                  <Badge>{r.targetType}</Badge> <span className="ms-2 font-medium">{t.report.reasons[r.reason]}</span>
                  <span className="ms-2 text-muted">{formatDate(locale, r.createdAt, "UTC", "medium")}</span>
                </p>
                {r.details ? <p className="text-sm text-muted">{r.details}</p> : null}
                <code className="block text-xs text-muted">{r.targetId}</code>
                <ReportActions reportId={r.id} targetType={r.targetType} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{t.admin.noReports}</p>
        )}
      </Card>
      <Card>
        <CardTitle>{t.admin.recentUsers}</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {overview.recentUsers.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="min-w-0">
                <span className="font-medium">{u.name ?? "—"}</span> <span className="text-muted">{u.email}</span> {u.isDemo ? <Badge tone="accent">{t.common.demo}</Badge> : null}
                {u.status === "suspended" ? <Badge tone="danger">{t.admin.suspend}</Badge> : null}
              </span>
              {u.id !== user.id ? <SuspendButton userId={u.id} suspended={u.status === "suspended"} /> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
