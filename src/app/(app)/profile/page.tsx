import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatDate, formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { getJourney } from "@/server/services/home";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.profile.title };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const { t, fmt, locale } = await getI18n();
  const journey = await getJourney(user.id);
  const links: Array<{ href: string; label: string; icon: IconName }> = [
    { href: "/profile/settings", label: t.profile.settings, icon: "settings" },
    { href: "/profile/dedications", label: t.profile.dedications, icon: "heart" },
    { href: "/notifications", label: t.profile.notifications, icon: "bell" },
    { href: "/profile/privacy", label: t.profile.privacy, icon: "shield" },
  ];
  if (user.platformRole === "admin") links.push({ href: "/admin", label: t.profile.admin, icon: "sparkle" });
  const figures = [
    { label: t.profile.juzCompleted, value: journey.juzCompleted },
    { label: t.profile.khatmasParticipated, value: journey.khatmasParticipated },
    { label: t.profile.khatmasCompleted, value: journey.khatmasCompleted },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Avatar name={user.name ?? user.email} src={user.avatarUrl} size={64} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{user.name ?? t.profile.title}</h1>
          <p className="truncate text-muted" dir="ltr">
            {user.email}
          </p>
        </div>
      </header>

      <Card>
        <CardTitle>{t.profile.journeyTitle}</CardTitle>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          {figures.map((f) => (
            <div key={f.label} className="rounded-2xl bg-surface-2 p-4 text-center">
              <dd className="text-2xl font-semibold tabular-nums">{formatNumber(locale, f.value)}</dd>
              <dt className="mt-1 text-xs text-muted sm:text-sm">{f.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">{t.profile.journeyNote}</p>
      </Card>

      <Card>
        <CardTitle>{t.profile.history}</CardTitle>
        {journey.history.length ? (
          <ul className="mt-3 divide-y divide-line">
            {journey.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/groups/${h.groupId}`} className="hover:underline">
                  {fmt(t.profile.historyItem, { n: formatNumber(locale, h.juzNumber), group: h.groupName })}
                </Link>
                {h.completedAt ? <span className="text-sm text-muted">{formatDate(locale, h.completedAt, user.timezone, "medium")}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{t.profile.noHistory}</p>
        )}
      </Card>

      <Card className="p-0 sm:p-0">
        <ul className="divide-y divide-line">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2">
                <Icon name={l.icon} className="text-xl text-muted" />
                <span className="flex-1 font-medium">{l.label}</span>
                <Icon name="chevronRight" className="text-muted rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <form action={logoutAction}>
        <Button type="submit" variant="ghost">
          <Icon name="logout" />
          {t.common.signOut}
        </Button>
      </form>
    </div>
  );
}
