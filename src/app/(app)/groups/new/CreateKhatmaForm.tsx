"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createGroupAction } from "@/app/actions/groups";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Field, Input, RadioCard, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { SCHEDULES, type Schedule } from "@/lib/db/schema";
import { TimezoneSelect } from "@/components/app/TimezoneSelect";

export function CreateKhatmaForm({ defaultTimezone, defaultRamadan }: { defaultTimezone: string; defaultRamadan: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const { run, pending, error } = useActionRunner();
  const [schedule, setSchedule] = useState<Schedule>("weekly");
  const [ramadan, setRamadan] = useState(defaultRamadan);
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(
      () =>
        createGroupAction({
          name: String(f.get("name") ?? ""),
          description: String(f.get("description") ?? "") || null,
          schedule,
          customDays: schedule === "custom" ? Number(f.get("customDays")) : null,
          startDate: String(f.get("startDate") ?? "") || null,
          timezone: String(f.get("timezone") ?? "UTC"),
          assignmentMode: mode,
          recurring: f.get("recurring") === "on",
          rotate: f.get("rotate") === "on",
          kind: ramadan ? "ramadan" : "standard",
        }),
      { onSuccess: (d) => router.push(`/groups/${d.id}?created=1`), refresh: false },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Card className="space-y-5">
        <Field label={t.create.name} htmlFor="name">
          <Input id="name" name="name" required maxLength={80} placeholder={t.create.namePlaceholder} autoFocus />
        </Field>
        <Field label={t.create.description} htmlFor="description" optionalLabel={t.common.optional}>
          <Textarea id="description" name="description" maxLength={280} placeholder={t.create.descriptionPlaceholder} rows={2} />
        </Field>
        <Checkbox checked={ramadan} onChange={(e) => setRamadan(e.target.checked)} label={t.create.ramadan} hint={t.create.ramadanHint} />
      </Card>

      {!ramadan ? (
        <Card className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">{t.create.schedule}</legend>
            <p className="mb-3 text-sm text-muted">{t.create.scheduleHint}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCHEDULES.map((s) => (
                <RadioCard key={s} name="schedule" value={s} checked={schedule === s} onChange={() => setSchedule(s)} label={t.schedule[s]} />
              ))}
            </div>
          </fieldset>
          {schedule === "custom" ? (
            <Field label={t.create.customDays} htmlFor="customDays">
              <Input id="customDays" name="customDays" type="number" min={1} max={365} defaultValue={14} inputMode="numeric" required />
            </Field>
          ) : null}
        </Card>
      ) : null}

      <Card className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.create.startDate} htmlFor="startDate" optionalLabel={t.common.optional}>
            <Input id="startDate" name="startDate" type="date" />
          </Field>
          <Field label={t.create.timezone} htmlFor="timezone" hint={t.create.timezoneHint}>
            <TimezoneSelect id="timezone" name="timezone" defaultValue={defaultTimezone} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t.create.mode}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <RadioCard name="mode" value="automatic" checked={mode === "automatic"} onChange={() => setMode("automatic")} label={t.create.modeAutomatic} hint={t.create.modeAutomaticHint} />
            <RadioCard name="mode" value="manual" checked={mode === "manual"} onChange={() => setMode("manual")} label={t.create.modeManual} hint={t.create.modeManualHint} />
          </div>
        </fieldset>
        {!ramadan ? (
          <div className="space-y-1">
            <Checkbox name="recurring" defaultChecked label={t.create.recurring} />
            <Checkbox name="rotate" defaultChecked label={t.create.rotate} />
          </div>
        ) : null}
      </Card>

      {error ? <Alert tone="error">{error}</Alert> : null}
      <p className="text-sm text-muted">{t.create.participantsHint}</p>
      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
        {t.create.submit}
      </Button>
    </form>
  );
}
