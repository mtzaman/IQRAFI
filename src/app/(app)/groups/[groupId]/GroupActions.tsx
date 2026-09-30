"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { leaveGroupAction, rebalanceAction, startKhatmaAction } from "@/app/actions/groups";
import { reassignAssignmentAction } from "@/app/actions/assignments";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n/client";

export function BeginKhatmaButton({ groupId, label }: { groupId: string; label: string }) {
  const { run, pending } = useActionRunner();
  return (
    <Button size="lg" loading={pending} onClick={() => run(() => startKhatmaAction(groupId))}>
      <Icon name="sparkle" />
      {label}
    </Button>
  );
}

export function LeaveGroupButton({ groupId, isOwner }: { groupId: string; isOwner: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { run, pending } = useActionRunner();
  if (isOwner) return <p className="text-sm text-muted">{t.group.ownerCannotLeave}</p>;
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon name="logout" />
        {t.group.leave}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.group.leave} closeLabel={t.common.close}>
        <p className="text-muted">{t.group.leaveConfirm}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" loading={pending} onClick={() => run(() => leaveGroupAction(groupId), { onSuccess: () => router.push("/groups") })}>
            {t.group.leave}
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Owner/admin tools: reassign a specific Juz, or rebalance unstarted Juz between current members. */
export function OrganiserTools({
  groupId,
  khatmaId,
  members,
  assignments,
}: {
  groupId: string;
  khatmaId: string;
  members: Array<{ userId: string; name: string }>;
  assignments: Array<{ id: string; juzNumber: number; userId: string | null }>;
}) {
  const { t, fmt } = useI18n();
  const { run, pending } = useActionRunner();
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const selected = assignments.find((a) => a.id === assignmentId);
  const [target, setTarget] = useState<string>("");
  if (!assignments.length) return null;
  return (
    <Card>
      <CardTitle>{t.group.admin}</CardTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={t.group.reassign} htmlFor="reassign-juz">
          <Select id="reassign-juz" value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {fmt(t.common.juz, { n: a.juzNumber })} — {a.userId ? (members.find((m) => m.userId === a.userId)?.name ?? t.common.reader) : t.group.nobody}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={selected ? fmt(t.group.reassignTo, { n: selected.juzNumber }) : t.group.reassign} htmlFor="reassign-to">
          <Select id="reassign-to" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">{t.group.toPool}</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="secondary" disabled={pending || !selected} onClick={() => run(() => reassignAssignmentAction(assignmentId, groupId, target || null), { success: t.common.saved })}>
          {t.common.save}
        </Button>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <Button variant="soft" disabled={pending} onClick={() => run(() => rebalanceAction(groupId, khatmaId), { success: t.group.rebalanceDone })}>
          {t.group.rebalance}
        </Button>
      </div>
    </Card>
  );
}
