"use client";

import { refreshStatsAction, resolveReportAction, setSuspendedAction } from "@/app/actions/admin";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

export function ReportActions({ reportId, targetType }: { reportId: string; targetType: "group" | "dedication" | "user" }) {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  const action = targetType === "dedication" ? "hide_dedication" : targetType === "group" ? "remove_group" : "suspend_user";
  const label = targetType === "dedication" ? t.admin.hideDedication : targetType === "group" ? t.admin.removeGroup : t.admin.suspendUser;
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, action))}>
        {label}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "dismiss"))}>
        {t.admin.dismiss}
      </Button>
    </div>
  );
}

export function SuspendButton({ userId, suspended }: { userId: string; suspended: boolean }) {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setSuspendedAction(userId, !suspended))}>
      {suspended ? t.admin.unsuspend : t.admin.suspend}
    </Button>
  );
}

export function RefreshStatsButton() {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => run(() => refreshStatsAction(), { success: t.admin.statsRefreshed })}>
      {t.admin.refreshStats}
    </Button>
  );
}
