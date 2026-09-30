"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  changeRoleAction,
  createInvitationAction,
  deleteGroupAction,
  removeMemberAction,
  revokeInvitationAction,
  transferOwnershipAction,
  updateGroupAction,
} from "@/app/actions/groups";
import { TimezoneSelect } from "@/components/app/TimezoneSelect";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Checkbox, Field, Input, RadioCard, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/config";
import { SCHEDULES, type GroupRole, type Schedule } from "@/lib/db/schema";
import { can, canManageMember } from "@/lib/permissions";

type GroupData = {
  id: string;
  name: string;
  description: string | null;
  schedule: Schedule;
  cycleDays: number;
  timezone: string;
  assignmentMode: "automatic" | "manual";
  recurring: boolean;
  rotate: boolean;
  kind: "standard" | "ramadan";
};

export function GroupSettingsForms({
  viewerId,
  role,
  appUrl,
  group,
  members,
  invitations,
}: {
  viewerId: string;
  role: GroupRole;
  appUrl: string;
  group: GroupData;
  members: Array<{ userId: string; name: string | null; role: GroupRole }>;
  invitations: Array<{ id: string; token: string; uses: number; maxUses: number | null; expiresAt: string | null }>;
}) {
  const { t, fmt, locale } = useI18n();
  const router = useRouter();
  const { run, pending } = useActionRunner();
  const [schedule, setSchedule] = useState<Schedule>(group.schedule);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; action: () => void; danger?: boolean }>(null);
  const isOwner = can(role, "group.update_schedule");

  const saveGeneral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(
      () =>
        updateGroupAction(group.id, {
          name: String(f.get("name")),
          description: String(f.get("description") ?? ""),
          assignmentMode: f.get("mode") === "manual" ? "manual" : "automatic",
          recurring: f.get("recurring") === "on",
          rotate: f.get("rotate") === "on",
        }),
      { success: t.common.saved },
    );
  };

  const saveSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(() => updateGroupAction(group.id, { schedule, customDays: schedule === "custom" ? Number(f.get("customDays")) : null, timezone: String(f.get("timezone")) }), {
      success: t.common.saved,
    });
  };

  const createInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const days = Number(f.get("expiresInDays")) || null;
    const uses = Number(f.get("maxUses")) || null;
    run(() => createInvitationAction(group.id, { expiresInDays: days, maxUses: uses }), { success: t.common.saved });
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={saveGeneral} className="space-y-4">
          <CardTitle>{t.settings.general}</CardTitle>
          <Field label={t.create.name} htmlFor="name">
            <Input id="name" name="name" defaultValue={group.name} required maxLength={80} />
          </Field>
          <Field label={t.create.description} htmlFor="description" optionalLabel={t.common.optional}>
            <Textarea id="description" name="description" defaultValue={group.description ?? ""} maxLength={280} rows={2} />
          </Field>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">{t.create.mode}</legend>
            <RadioCard name="mode" value="automatic" defaultChecked={group.assignmentMode === "automatic"} label={t.create.modeAutomatic} hint={t.create.modeAutomaticHint} />
            <RadioCard name="mode" value="manual" defaultChecked={group.assignmentMode === "manual"} label={t.create.modeManual} hint={t.create.modeManualHint} />
          </fieldset>
          <Checkbox name="recurring" defaultChecked={group.recurring} label={t.create.recurring} />
          <Checkbox name="rotate" defaultChecked={group.rotate} label={t.create.rotate} />
          <Button type="submit" disabled={pending}>
            {t.common.save}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={saveSchedule} className="space-y-4">
          <CardTitle>{t.settings.scheduleSection}</CardTitle>
          <p className="text-sm text-muted">{isOwner ? t.settings.scheduleNote : t.settings.ownerOnly}</p>
          <fieldset disabled={!isOwner} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {SCHEDULES.map((s) => (
                <RadioCard key={s} name="schedule" value={s} checked={schedule === s} onChange={() => setSchedule(s)} label={t.schedule[s]} />
              ))}
            </div>
            {schedule === "custom" ? (
              <Field label={t.create.customDays} htmlFor="customDays">
                <Input id="customDays" name="customDays" type="number" min={1} max={365} defaultValue={group.cycleDays} />
              </Field>
            ) : null}
            <Field label={t.create.timezone} htmlFor="timezone">
              <TimezoneSelect id="timezone" name="timezone" defaultValue={group.timezone} />
            </Field>
            <Button type="submit" disabled={pending || !isOwner}>
              {t.common.save}
            </Button>
          </fieldset>
        </form>
      </Card>

      <Card>
        <CardTitle>{t.settings.invitations}</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {invitations.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <code className="block truncate text-sm" dir="ltr">
                  {appUrl}/invite/{i.token}
                </code>
                <p className="text-xs text-muted">
                  {fmt(t.settings.uses, { n: i.uses })}
                  {i.maxUses ? ` / ${i.maxUses}` : ""} · {i.expiresAt ? fmt(t.settings.expires, { date: formatDate(locale, new Date(i.expiresAt), "UTC", "medium") }) : t.settings.never}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => run(() => revokeInvitationAction(group.id, i.id))}>
                {t.settings.revoke}
              </Button>
            </li>
          ))}
        </ul>
        <form onSubmit={createInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label={t.settings.expiresIn} htmlFor="expiresInDays" optionalLabel={t.common.optional}>
            <Input id="expiresInDays" name="expiresInDays" type="number" min={1} max={365} placeholder={t.settings.never} />
          </Field>
          <Field label={t.settings.maxUses} htmlFor="maxUses" optionalLabel={t.common.optional}>
            <Input id="maxUses" name="maxUses" type="number" min={1} max={10000} placeholder={t.settings.unlimited} />
          </Field>
          <Button type="submit" variant="secondary" disabled={pending}>
            {t.settings.newInvite}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>{t.settings.membersSection}</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {members.map((m) => {
            const name = m.name ?? t.common.reader;
            const manageable = m.userId !== viewerId && canManageMember(role, m.role);
            return (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-medium">
                  {name} {m.userId === viewerId ? <span className="text-muted">({t.common.you})</span> : null}{" "}
                  {m.role !== "member" ? <Badge tone="primary">{t.groups.roles[m.role]}</Badge> : null}
                </span>
                {manageable ? (
                  <span className="flex flex-wrap gap-1">
                    {isOwner ? (
                      <Button variant="ghost" size="sm" onClick={() => run(() => changeRoleAction(group.id, m.userId, m.role === "admin" ? "member" : "admin"))}>
                        {m.role === "admin" ? t.settings.makeMember : t.settings.makeAdmin}
                      </Button>
                    ) : null}
                    {isOwner ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirm({ title: t.settings.transfer, body: fmt(t.settings.transferConfirm, { name }), action: () => run(() => transferOwnershipAction(group.id, m.userId), { onSuccess: () => router.push(`/groups/${group.id}`) }) })}
                      >
                        {t.settings.transfer}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirm({ title: t.settings.remove, body: fmt(t.settings.removeConfirm, { name }), danger: true, action: () => run(() => removeMemberAction(group.id, m.userId)) })}
                    >
                      {t.settings.remove}
                    </Button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      {can(role, "group.delete") ? (
        <Card className="border-danger/40">
          <CardTitle>{t.settings.danger}</CardTitle>
          <p className="mt-1 text-sm text-muted">{t.settings.dangerBody}</p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => setConfirm({ title: t.settings.danger, body: t.settings.deleteConfirm, danger: true, action: () => run(() => deleteGroupAction(group.id), { success: t.settings.deleted, onSuccess: () => router.push("/groups") }) })}
          >
            {t.common.delete}
          </Button>
        </Card>
      ) : null}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title ?? ""} closeLabel={t.common.close}>
        <p className="text-muted">{confirm?.body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            {t.common.cancel}
          </Button>
          <Button
            variant={confirm?.danger ? "danger" : "primary"}
            loading={pending}
            onClick={() => {
              confirm?.action();
              setConfirm(null);
            }}
          >
            {t.common.confirm}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
