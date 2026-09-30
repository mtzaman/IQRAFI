import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { can } from "@/lib/permissions";
import { requireUser } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { getGroupOverview } from "@/server/services/groups";
import { GroupSettingsForms } from "./GroupSettingsForms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.settings.title };
}

export default async function GroupSettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser();
  const { t } = await getI18n();
  let data;
  try {
    data = await getGroupOverview(user.id, groupId);
  } catch (e) {
    if (isAppError(e)) notFound();
    throw e;
  }
  const role = data.membership.role;
  if (!can(role, "group.update_settings")) notFound();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>
      <GroupSettingsForms
        viewerId={user.id}
        role={role}
        appUrl={appUrl}
        group={{
          id: data.group.id,
          name: data.group.name,
          description: data.group.description,
          schedule: data.group.schedule,
          cycleDays: data.group.cycleDays,
          timezone: data.group.timezone,
          assignmentMode: data.group.assignmentMode,
          recurring: data.group.recurring,
          rotate: data.group.rotate,
          kind: data.group.kind,
        }}
        members={data.members.map((m) => ({ userId: m.userId, name: m.name, role: m.role }))}
        invitations={data.invitations.map((i) => ({ id: i.id, token: i.token, uses: i.uses, maxUses: i.maxUses, expiresAt: i.expiresAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
