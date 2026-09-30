"use client";

import { useState } from "react";
import { deleteDedicationAction, saveDedicationAction } from "@/app/actions/dedications";
import { useActionRunner } from "@/components/app/useActionRunner";
import { dedicationLine } from "@/components/khatma/dedication-text";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Checkbox, Field, Input, RadioCard, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/i18n/client";
import { DEDICATION_TYPES, type DedicationType, type DedicationVisibility } from "@/lib/db/schema";

type Existing = { id: string; type: DedicationType; name: string | null; message: string | null; visibility: DedicationVisibility };

const NAMED: DedicationType[] = ["in_memory", "loved_one", "other"];

/** Optional dedication: "Would you like to add a dedication?" → who → privacy (private by default). */
export function DedicationPanel({ khatmaId, existing, startOpen }: { khatmaId: string; existing: Existing | null; startOpen: boolean }) {
  const { t } = useI18n();
  const { run, pending } = useActionRunner();
  const [stage, setStage] = useState<"ask" | "form" | "done">(existing ? "done" : startOpen ? "ask" : "done");
  const [type, setType] = useState<DedicationType>(existing?.type ?? "family");
  const [visibility, setVisibility] = useState<DedicationVisibility>(existing?.visibility ?? "private");
  const [confirmPublic, setConfirmPublic] = useState(existing?.visibility === "public");

  if (stage === "ask") {
    return (
      <Card className="text-center">
        <CardTitle>{t.dedication.ask}</CardTitle>
        <p className="mt-1 text-muted">{t.dedication.askBody}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button onClick={() => setStage("form")}>{t.dedication.yes}</Button>
          <Button variant="ghost" onClick={() => setStage("done")}>
            {t.dedication.notNow}
          </Button>
        </div>
      </Card>
    );
  }

  if (stage === "done") {
    return existing ? (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{dedicationLine(t, existing.type, existing.name)}</p>
            {existing.message ? <p className="mt-1 text-muted">{existing.message}</p> : null}
          </div>
          <Badge>{existing.visibility === "private" ? t.dedication.privateBadge : existing.visibility === "group" ? t.dedication.groupBadge : t.dedication.publicBadge}</Badge>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStage("form")}>
            {t.dedication.edit}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => deleteDedicationAction(khatmaId, existing.id))}>
            {t.dedication.remove}
          </Button>
        </div>
      </Card>
    ) : (
      <div className="text-center">
        <Button variant="soft" onClick={() => setStage("form")}>
          {t.dedication.yes}
        </Button>
      </div>
    );
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(
      () =>
        saveDedicationAction(khatmaId, {
          type,
          name: NAMED.includes(type) ? String(f.get("name") ?? "") : null,
          message: String(f.get("message") ?? ""),
          visibility,
          confirmPublic: visibility === "public" && confirmPublic,
        }),
      { success: t.common.saved, onSuccess: () => setStage("done") },
    );
  };

  return (
    <Card>
      <form onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="mb-3 text-lg font-semibold">{t.dedication.whoFor}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEDICATION_TYPES.map((d) => (
              <RadioCard key={d} name="type" value={d} checked={type === d} onChange={() => setType(d)} label={t.dedication.types[d]} />
            ))}
          </div>
        </fieldset>
        {NAMED.includes(type) ? (
          <Field label={t.dedication.name} htmlFor="ded-name" optionalLabel={t.common.optional}>
            <Input id="ded-name" name="name" defaultValue={existing?.name ?? ""} maxLength={120} placeholder={t.dedication.namePlaceholder} />
          </Field>
        ) : null}
        <Field label={t.dedication.message} htmlFor="ded-message" optionalLabel={t.common.optional}>
          <Textarea id="ded-message" name="message" defaultValue={existing?.message ?? ""} maxLength={500} rows={3} placeholder={t.dedication.messagePlaceholder} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t.dedication.visibility}</legend>
          <div className="grid gap-2">
            {(["private", "group", "public"] as const).map((v) => (
              <RadioCard key={v} name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} label={t.dedication.visibilities[v]} />
            ))}
          </div>
          {visibility === "public" ? (
            <Checkbox className="mt-3" checked={confirmPublic} onChange={(e) => setConfirmPublic(e.target.checked)} label={t.dedication.confirmPublic} required />
          ) : null}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={pending} disabled={visibility === "public" && !confirmPublic}>
            {t.dedication.save}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStage("done")}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
