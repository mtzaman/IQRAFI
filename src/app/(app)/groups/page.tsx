import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/States";
import { formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { listUserGroups } from "@/server/services/groups";
import { scheduleLabel } from "@/components/khatma/schedule-label";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.groups.title };
}

export default async function GroupsPage() {
  const user = await requireUser();
  const { t, fmt, locale } = await getI18n();
  const groups = await listUserGroups(user.id);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.groups.title}</h1>
        <div className="flex gap-2">
          <ButtonLink href="/groups/join" variant="secondary">
            {t.groups.join}
          </ButtonLink>
          <ButtonLink href="/groups/new">
            <Icon name="plus" />
            {t.groups.create}
          </ButtonLink>
        </div>
      </header>
      {groups.length === 0 ? (
        <EmptyState icon="groups" title={t.groups.empty} body={t.home.noGroupsBody}>
          <ButtonLink href="/groups/new">{t.groups.create}</ButtonLink>
          <ButtonLink href="/groups/join" variant="secondary">
            {t.groups.join}
          </ButtonLink>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`} className="block h-full rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)] transition-colors hover:bg-surface-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{g.name}</h2>
                  <Badge tone={g.role === "member" ? "neutral" : "primary"}>{t.groups.roles[g.role]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {g.memberCount === 1 ? t.groups.member1 : fmt(t.groups.members, { n: formatNumber(locale, g.memberCount) })} · {scheduleLabel(t, g)}
                  {g.isDemo ? ` · ${t.common.demo}` : ""}
                </p>
                {g.activeKhatma ? (
                  <div className="mt-4">
                    <p className="text-sm">
                      {fmt(t.groups.cycle, { n: g.activeKhatma.cycleNumber })} · {fmt(t.home.juzProgress, { done: formatNumber(locale, g.activeKhatma.completed) })}
                    </p>
                    <ProgressBar className="mt-2" value={g.activeKhatma.completed} max={30} label={g.name} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-accent-text">{t.groups.gathering}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
