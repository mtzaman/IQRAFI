"use client";

import { useState } from "react";
import { deleteAccountAction, unblockUserAction } from "@/app/actions/profile";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";

export function DeleteAccount() {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const { run, pending } = useActionRunner();
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => deleteAccountAction(value), { refresh: false });
      }}
    >
      <Field label={t.privacy.deleteConfirmLabel} htmlFor="confirm-delete">
        <Input id="confirm-delete" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" autoComplete="off" />
      </Field>
      <Button type="submit" variant="danger" disabled={value !== "DELETE"} loading={pending}>
        {t.privacy.deleteButton}
      </Button>
    </form>
  );
}

export function UnblockButton({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => unblockUserAction(userId))}>
      {t.privacy.unblock}
    </Button>
  );
}
