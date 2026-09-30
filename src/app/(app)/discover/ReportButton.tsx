"use client";

import { useState } from "react";
import { reportAction } from "@/app/actions/profile";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { Field, RadioCard, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";

export function ReportButton({ targetType, targetId }: { targetType: "group" | "dedication" | "user"; targetId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"inappropriate" | "spam" | "abuse" | "other">("inappropriate");
  const { run, pending } = useActionRunner();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text">
        <Icon name="flag" /> {t.common.report}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.report.title} closeLabel={t.common.close}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const details = String(new FormData(e.currentTarget).get("details") ?? "");
            run(() => reportAction({ targetType, targetId, reason, details }), { success: t.report.thanks, onSuccess: () => setOpen(false), refresh: false });
          }}
        >
          <p className="text-sm text-muted">{t.report.body}</p>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t.report.reason}</legend>
            {(["inappropriate", "spam", "abuse", "other"] as const).map((r) => (
              <RadioCard key={r} name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} label={t.report.reasons[r]} />
            ))}
          </fieldset>
          <Field label={t.report.details} htmlFor="report-details" optionalLabel={t.common.optional}>
            <Textarea id="report-details" name="details" maxLength={1000} rows={3} />
          </Field>
          <Button type="submit" loading={pending}>
            {t.report.submit}
          </Button>
        </form>
      </Modal>
    </>
  );
}
