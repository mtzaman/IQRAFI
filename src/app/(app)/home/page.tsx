import type { Metadata } from "next";
import Link from "next/link";
import { ClaimButton, CompleteButton, NeedHelpActions, ReadLink } from "@/components/khatma/AssignmentActions";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle, Eyebrow } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { JuzRing, ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/States";
import { formatDate, formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { dateInTimezone } from "@/lib/khatma/schedule";
import { requireUser } from "@/server/auth/current";
import { listUserGroups } from "@/server/services/groups";
import { getActiveKhatmaSummaries, recentlyCompletedKhatmas, type KhatmaSummary } from "@/server/services/home";
import { getGlobalStats } from "@/server/services/stats";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.home };
}

function pickCurrent(summaries: KhatmaSummary[]) {
  return summaries.find((s) => s.myAssignments.some((a) => a.status !== "completed")) ?? summaries[0] ?? null;
}

export default async function HomePage() {
  const user = await requireUser();
  const { t, fmt, locale } = await getI18n();
  const [summaries, groups, completed, stats] = await Promise.all([
    getActiveKhatmaSummaries(user.id),
    listUserGroups(user.id),
    recentlyCompletedKhatmas(user.id),
    getGlobalStats(),
  ]);
  const current = pickCurrent(summaries);
  const others = summaries.filter((s) => s !== current);
  const gathering = groups.filter((g) => !g.activeKhatma);
  const nextAssignment = current?.myAssignments.find((a) => a.status !== "completed") ?? null;
  const today = current ? dateInTimezone(new Date(), current.timezone) : "";
  const overdue = !!current && today > current.dueDate;
  const notYetStarted = !!current && current.startDate > today;
  const openJuz = summaries.flatMap((s) => s.openJuz.map((j) => ({ ...j, groupId: s.groupId, groupName: s.groupName }))).slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{user.name ? fmt(t.home.greetingNamed, { name: user.name }) : t.home.greeting}</h1>
        <p className="mt-1 text-muted">{t.brand.supporting}</p>
      </header>

      {completed.map((c) => (
        <Card key={c.khatmaId} className="border-accent/50 bg-gradient-to-br from-surface to-primary-soft">
          <Eyebrow>{t.home.completedCardTitle}</Eyebrow>
          <p className="mt-2 text-lg font-medium">{fmt(t.home.completedCardBody, { group: c.groupName })}</p>
          <p className="mt-1 text-muted">{t.completion.prayer}</p>
          <ButtonLink href={`/khatma/${c.khatmaId}`} variant="secondary" className="mt-4">
            {t.home.viewCompletion}
          </ButtonLink>
        </Card>
      ))}

      {!current && gathering.length === 0 ? (
        <EmptyState icon="groups" title={t.home.noGroups} body={t.home.noGroupsBody}>
          <ButtonLink href="/groups/new">
            <Icon name="plus" />
            {t.groups.create}
          </ButtonLink>
          <ButtonLink href="/groups/join" variant="secondary">
            {t.groups.join}
          </ButtonLink>
        </EmptyState>
      ) : null}

      {current ? (
        <>
          {/* 1. Current Khatma */}
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <JuzRing completed={current.juzCompleted} label={fmt(t.home.juzProgress, { done: current.juzCompleted })}>
                <span className="text-2xl font-semibold">{formatNumber(locale, current.juzCompleted)}</span>
                <span className="text-xs text-muted">/ {formatNumber(locale, 30)}</span>
              </JuzRing>
              <div className="min-w-0 flex-1">
                <Eyebrow>{t.home.currentKhatma}</Eyebrow>
                <h2 className="mt-1 truncate text-xl font-semibold">
                  <Link href={`/groups/${current.groupId}`} className="hover:underline">
                    {current.groupName}
                  </Link>
                </h2>
                <p className="mt-1 text-muted">
                  {fmt(t.home.juzProgress, { done: formatNumber(locale, current.juzCompleted) })} · {fmt(t.home.juzRemaining, { n: formatNumber(locale, 30 - current.juzCompleted) })}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {notYetStarted
                    ? fmt(t.home.beginsOn, { date: formatDate(locale, current.startDate) })
                    : current.groupKind === "ramadan"
                      ? fmt(t.home.ramadanDay, { day: Math.min(current.dayOfCycle, 30) })
                      : `${fmt(t.home.dayOf, { day: Math.min(current.dayOfCycle, current.cycleDays), total: current.cycleDays })} · ${fmt(t.home.finishBy, { date: formatDate(locale, current.dueDate) })}`}
                </p>
                <ProgressBar className="mt-4" value={current.juzCompleted} max={30} label={t.home.currentKhatma} valueText={fmt(t.home.juzProgress, { done: current.juzCompleted })} />
                {nextAssignment ? (
                  <div className="mt-5">
                    <ReadLink juzNumber={nextAssignment.juzNumber} assignmentId={nextAssignment.id} label={t.home.continueReading} size="lg" />
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          {/* 2. Today's assignment */}
          <Card>
            <Eyebrow>{t.home.todayTitle}</Eyebrow>
            {nextAssignment ? (
              <div className="mt-2 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-2xl font-semibold">{fmt(t.common.juz, { n: formatNumber(locale, nextAssignment.juzNumber) })}</h2>
                  <p className="text-muted">
                    {nextAssignment.status === "in_progress" ? fmt(t.status.in_progress, { n: nextAssignment.progress }) : t.status.pending}
                  </p>
                </div>
                {nextAssignment.status === "in_progress" ? (
                  <ProgressBar value={nextAssignment.progress} label={fmt(t.common.juz, { n: nextAssignment.juzNumber })} valueText={fmt(t.status.in_progress, { n: nextAssignment.progress })} />
                ) : null}
                {overdue ? (
                  <div className="rounded-2xl bg-surface-2 p-4">
                    <p className="font-medium">{t.home.waitingTitle}</p>
                    <p className="mt-1 text-sm text-muted">{t.home.waitingBody}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <ReadLink
                    juzNumber={nextAssignment.juzNumber}
                    assignmentId={nextAssignment.id}
                    label={nextAssignment.status === "in_progress" ? t.home.continueReading : t.home.readJuz}
                  />
                  <CompleteButton assignmentId={nextAssignment.id} juzNumber={nextAssignment.juzNumber} />
                </div>
                <details className="group">
                  <summary className="cursor-pointer list-none text-sm font-medium text-muted hover:text-text">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="hand" /> {t.home.askHelp}…
                    </span>
                  </summary>
                  <div className="mt-2">
                    <NeedHelpActions assignmentId={nextAssignment.id} groupId={current.groupId} helpRequested={!!nextAssignment.helpRequestedAt} />
                  </div>
                </details>
                {current.myAssignments.length > 1 ? (
                  <p className="text-sm text-muted">
                    {t.group.yourJuz}:{" "}
                    {current.myAssignments
                      .map((a) => (a.status === "completed" ? `✓ ${formatNumber(locale, a.juzNumber)}` : formatNumber(locale, a.juzNumber)))
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-muted">{current.myAssignments.length ? t.home.allMineDone : t.home.noAssignment}</p>
            )}
          </Card>

          {/* 3. Group progress */}
          <Card>
            <CardTitle>{t.home.groupToday}</CardTitle>
            <p className="mt-2">{fmt(t.home.readersDone, { done: formatNumber(locale, current.readersDone), total: formatNumber(locale, current.readers) })}</p>
            <ProgressBar
              className="mt-3"
              value={current.readersDone}
              max={Math.max(1, current.readers)}
              label={t.home.groupToday}
              valueText={`${current.readersDone} / ${current.readers}`}
            />
            <p className="mt-3 text-sm text-accent-text">{t.home.encouragement}</p>
          </Card>
        </>
      ) : null}

      {openJuz.length ? (
        <Card>
          <CardTitle>{t.home.openJuzTitle}</CardTitle>
          <ul className="mt-3 divide-y divide-line">
            {openJuz.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  {fmt(t.home.openJuzItem, { n: formatNumber(locale, j.juzNumber), group: j.groupName })}
                  <span className="ms-2 text-sm text-muted">{j.help ? t.status.help : t.status.available}</span>
                </span>
                <ClaimButton assignmentId={j.id} groupId={j.groupId} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {gathering.map((g) => (
        <Card key={g.id}>
          <Eyebrow>{t.home.notStartedGroup}</Eyebrow>
          <h2 className="mt-1 text-lg font-semibold">{g.name}</h2>
          <p className="mt-1 text-muted">{t.home.notStartedBody}</p>
          <ButtonLink href={`/groups/${g.id}`} variant="secondary" className="mt-4">
            {t.common.continue}
          </ButtonLink>
        </Card>
      ))}

      {others.length ? (
        <section aria-labelledby="more-khatmas" className="space-y-3">
          <h2 id="more-khatmas" className="text-lg font-semibold">
            {t.home.moreKhatmas}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {others.map((s) => (
              <li key={s.khatmaId}>
                <Link href={`/groups/${s.groupId}`} className="block rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:bg-surface-2">
                  <p className="font-medium">{s.groupName}</p>
                  <p className="text-sm text-muted">{fmt(t.home.juzProgress, { done: s.juzCompleted })}</p>
                  <ProgressBar className="mt-2" value={s.juzCompleted} max={30} label={s.groupName} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 5. Global collective progress */}
      <Link href="/discover" className="block rounded-[var(--radius-card)] bg-primary p-5 text-on-primary shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95 sm:p-6">
        <p className="text-sm font-medium opacity-85">{t.home.worldTitle}</p>
        <p className="mt-1 text-xl font-semibold">{fmt(t.home.worldToday, { n: formatNumber(locale, stats.juzCompletedToday) })}</p>
        <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium opacity-90">
          {t.home.worldLink} <Icon name="chevronRight" className="rtl:rotate-180" />
        </p>
      </Link>
    </div>
  );
}
