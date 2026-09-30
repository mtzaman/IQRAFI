"use client";

import { markNotificationsReadAction } from "@/app/actions/profile";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

export function MarkAllRead() {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => markNotificationsReadAction())}>
      {t.notifications.markAllRead}
    </Button>
  );
}
