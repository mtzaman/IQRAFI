"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";

/** Accepts a full invitation URL or a bare token and opens the invitation page. */
export function JoinForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const match = /(?:invite\/)?([A-Za-z0-9_-]{10,64})\/?$/.exec(value.trim());
        if (!match) return setError(t.groups.joinInvalid);
        router.push(`/invite/${match[1]}`);
      }}
    >
      <Field label={t.groups.joinTitle} htmlFor="invite" error={error}>
        <Input id="invite" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t.groups.joinPlaceholder} aria-invalid={!!error} autoComplete="off" required />
      </Field>
      <Button type="submit">{t.groups.joinSubmit}</Button>
    </form>
  );
}
