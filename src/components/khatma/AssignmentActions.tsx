"use client";

import { useState } from "react";
import { claimAssignmentAction, completeAssignmentAction, releaseAssignmentAction, requestHelpAction } from "@/app/actions/assignments";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";
import { useRouter } from "next/navigation";

/** "Mark Complete" always requires a deliberate confirmation. Safe to retry (idempotent server action). */
export function CompleteButton({ assignmentId, juzNumber, variant = "secondary", size = "md", label }: { assignmentId: string; juzNumber: number; variant?: "primary" | "secondary"; size?: "md" | "lg"; label?: string }) {
  const { t, fmt } = useI18n();
  const [open, setOpen] = useState(false);
  const { run, pending } = useActionRunner();
  const router = useRouter();
  const confirm = () =>
    run(() => completeAssignmentAction(assignmentId), {
      success: fmt(t.home.completedToast, { n: juzNumber }),
      refresh: false,
      onSuccess: (r) => {
        setOpen(false);
        // The final Juz completes the Khatma: go straight to the peaceful completion screen.
        if (r.khatmaCompleted) router.push(`/khatma/${r.khatmaId}`);
        else router.refresh();
      },
    });
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Icon name="check" />
        {label ?? t.home.markComplete}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={fmt(t.home.confirmTitle, { n: juzNumber })} closeLabel={t.common.close}>
        <p className="text-muted">{fmt(t.home.confirmBody, { n: juzNumber })}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={confirm} loading={pending}>
            {t.home.confirmYes}
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Gentle options when a Juz is taking longer: never shaming, always optional. */
export function NeedHelpActions({ assignmentId, groupId, helpRequested }: { assignmentId: string; groupId: string; helpRequested: boolean }) {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  if (helpRequested) return <p className="text-sm text-muted">{t.home.helpRequested}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => requestHelpAction(assignmentId, groupId))}>
        <Icon name="hand" />
        {t.home.askHelp}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => releaseAssignmentAction(assignmentId, groupId))}>
        <Icon name="share" />
        {t.home.letOthers}
      </Button>
    </div>
  );
}

export function ClaimButton({ assignmentId, groupId, label, size = "sm" }: { assignmentId: string; groupId: string; label?: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  const router = useRouter();
  return (
    <Button
      variant="soft"
      size={size}
      loading={pending}
      onClick={() =>
        run(() => claimAssignmentAction(assignmentId, groupId), {
          onSuccess: (r) => router.push(`/quran/juz/${r.juzNumber}?assignment=${r.assignmentId}`),
        })
      }
    >
      <Icon name="heart" />
      {label ?? t.home.helpComplete}
    </Button>
  );
}

export function ReadLink({ juzNumber, assignmentId, label, variant = "primary", size = "md" }: { juzNumber: number; assignmentId?: string; label: string; variant?: "primary" | "secondary" | "soft"; size?: "md" | "lg" }) {
  return (
    <ButtonLink href={`/quran/juz/${juzNumber}${assignmentId ? `?assignment=${assignmentId}` : ""}`} variant={variant} size={size}>
      <Icon name="book" />
      {label}
    </ButtonLink>
  );
}
