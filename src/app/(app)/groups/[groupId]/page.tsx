import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { InvitePanel } from "@/components/khatma/InvitePanel";
import { JuzGrid } from "@/components/khatma/JuzGrid";
import { scheduleLabel } from "@/components/khatma/schedule-label";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle, Eyebrow } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { JuzRing } from "@/components/ui/Progress";
import { Alert } from "@/components/ui/States";
import { formatDate, formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { dateInTimezone } from "@/lib/khatma/schedule";
import { can } from "@/lib/permissions";
import { requireUser } from "@/server/auth/current";
import { isAppError } from "@/server/errors";
import { getGroupOverview } from "@/server/services/groups";
import { BeginKhatmaButton, LeaveGroupButton, OrganiserTools } from "./GroupActions";

type Params = { params: Promise<{ groupId: string }>; searchParams: Promise<{ created?: string; joined?: string }> };

async function load(userId: string, groupId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  try {
    return await getGroupOverview(userId, groupId);
  } catch (e) {
    if (isAppError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { groupId } = await params;
  const user = await requireUser();
  const data = await load(user.id, groupId);
  return { title: data.group.name };
}

export default async function GroupPage({ params, searchParams }: Params) {
  const { groupId } = await params;
  const { created, joined } = await searchParams;
  const user = await requireUser();
  const { t, fmt, locale } = await getI18n();
  const data = await load(user.id, groupId);
  const { group, membership, members, current, assignments } = data;
  const role = membership.role;
  const names = new Map(members.map((m) => [m.userId, m.name ?? t.common.reader]));
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = data.shareInvite ? `${appUrl}/invite/${data.shareInvite.token}` : null;
  const qrSvg = link ? await QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#0a3f30", light: "#ffffff" } }) : "";
  const completedCount = assignments.filter((a) => a.status === "completed").length;
  const today = dateInTimezone(new Date(), group.timezone);
  const overdue = !!current && today > current.dueDate;
  const history = data.khatmas.filter((k) => k.status !== "active");
  const lastCompleted = history.find((k) => k.status === "completed");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={role === "member" ? "neutral" : "primary"}>{t.groups.roles[role]}</Badge>
          {group.isDemo ? <Badge tone="accent">{t.common.demo}</Badge> : null}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{group.name}</h1>
          {can(role, "group.update_settings") ? (
            <ButtonLink href={`/groups/${group.id}/settings`} variant="secondary" size="sm">
              <Icon name="settings" />
              {t.group.settings}
            </ButtonLink>
          ) : null}
        </div>
        {group.description ? <p className="text-muted">{group.description}</p> : null}
        <p className="text-sm text-muted">
          {members.length === 1 ? t.groups.member1 : fmt(t.groups.members, { n: formatNumber(locale, members.length) })} · {scheduleLabel(t, group)} · {group.timezone.replace(/_/g, " ")}
        </p>
      </header>

      {joined ? <Alert tone="success">{fmt(t.invite.welcome, { group: group.name })}</Alert> : null}

      {current ? (
        <Card>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <JuzRing completed={completedCount} label={fmt(t.home.juzProgress, { done: completedCount })}>
              <span className="text-2xl font-semibold">{formatNumber(locale, completedCount)}</span>
              <span className="text-xs text-muted">/ {formatNumber(locale, 30)}</span>
            </JuzRing>
            <div>
              <Eyebrow>{fmt(t.groups.cycle, { n: current.cycleNumber })}</Eyebrow>
              <h2 className="mt-1 text-xl font-semibold">{t.group.progressTitle}</h2>
              <p className="mt-1 text-muted">
                {fmt(t.home.juzProgress, { done: formatNumber(locale, completedCount) })} · {fmt(t.home.juzRemaining, { n: formatNumber(locale, 30 - completedCount) })}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {current.startDate > today ? fmt(t.home.beginsOn, { date: formatDate(locale, current.startDate) }) : fmt(t.home.finishBy, { date: formatDate(locale, current.dueDate) })}
              </p>
              <p className="mt-3 text-sm text-accent-text">{t.home.encouragement}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-accent/40">
          <Eyebrow>{t.home.notStartedGroup}</Eyebrow>
          {lastCompleted ? (
            <p className="mt-2 font-medium">
              {t.completion.title} — {fmt(t.group.completedOn, { date: formatDate(locale, lastCompleted.completedAt!, group.timezone) })}
            </p>
          ) : (
            <h2 className="mt-2 text-lg font-semibold">{t.group.gatheringTitle}</h2>
          )}
          {can(role, "khatma.start_next") ? (
            <>
              <p className="mt-1 text-muted">{fmt(t.group.gatheringBody, { n: formatNumber(locale, members.length) })}</p>
              <div className="mt-4">
                <BeginKhatmaButton groupId={group.id} label={lastCompleted ? t.group.startNext : t.group.begin} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-muted">{t.group.gatheringMember}</p>
          )}
        </Card>
      )}

      {created && link ? <Alert tone="success">{t.group.gatheringTitle}</Alert> : null}
      {link ? <InvitePanel link={link} qrSvg={qrSvg} groupName={group.name} /> : null}

      {current ? (
        <section aria-labelledby="juz-map" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="juz-map" className="text-lg font-semibold">
              {t.group.juzMapTitle}
            </h2>
          </div>
          <JuzGrid assignments={assignments} viewerId={user.id} names={names} groupId={group.id} canClaimOverdue={overdue} t={t} />
        </section>
      ) : null}

      {current && can(role, "assignments.reassign") ? (
        <OrganiserTools
          groupId={group.id}
          khatmaId={current.id}
          members={members.map((m) => ({ userId: m.userId, name: m.userId === user.id ? `${m.name ?? t.common.reader} (${t.common.you})` : (m.name ?? t.common.reader) }))}
          assignments={assignments.filter((a) => a.status !== "completed").map((a) => ({ id: a.id, juzNumber: a.juzNumber, userId: a.userId }))}
        />
      ) : null}

      <Card>
        <CardTitle>{t.group.membersTitle}</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 py-3">
              <Avatar name={m.name} src={m.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name ?? t.common.reader}
                  {m.userId === user.id ? <span className="ms-1 text-muted">({t.common.you})</span> : null}
                </p>
                <p className="text-sm text-muted">{fmt(t.group.joined, { date: formatDate(locale, m.joinedAt, group.timezone, "medium") })}</p>
              </div>
              {m.role !== "member" ? <Badge tone="primary">{t.groups.roles[m.role]}</Badge> : null}
            </li>
          ))}
        </ul>
      </Card>

      {history.length ? (
        <Card>
          <CardTitle>{t.group.history}</CardTitle>
          <ul className="mt-3 divide-y divide-line">
            {history.map((k) => (
              <li key={k.id}>
                <Link href={`/khatma/${k.id}`} className="flex items-center justify-between gap-3 py-3 hover:underline">
                  <span>{fmt(t.groups.cycle, { n: k.cycleNumber })}</span>
                  <span className="text-sm text-muted">
                    {k.status === "completed" && k.completedAt ? fmt(t.group.completedOn, { date: formatDate(locale, k.completedAt, group.timezone, "medium") }) : t.group.cancelled}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="pt-2">
        <LeaveGroupButton groupId={group.id} isOwner={role === "owner"} />
      </div>
    </div>
  );
}
