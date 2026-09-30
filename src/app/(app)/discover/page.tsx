import type { Metadata } from "next";
import { GlobalStatsGrid } from "@/components/app/GlobalStats";
import { dedicationLine } from "@/components/khatma/dedication-text";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { listPublicDedications } from "@/server/services/dedications";
import { getGlobalStats } from "@/server/services/stats";
import { ReportButton } from "./ReportButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.discover.title };
}

export default async function DiscoverPage() {
  const { t, locale } = await getI18n();
  const user = await getCurrentUser();
  const [stats, dedications] = await Promise.all([getGlobalStats(), listPublicDedications(user?.id ?? null)]);
  const coming = [
    { key: "ramadan", available: true, href: "/groups/new?ramadan=1" },
    { key: "family", available: false },
    { key: "mosque", available: false },
    { key: "hifz", available: false },
  ] as const;
  return (
    <div className="space-y-8">
      <section className="rounded-[var(--radius-card)] bg-primary p-6 text-on-primary shadow-[var(--shadow-soft)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t.discover.title}</h1>
        <p className="mt-2 text-lg opacity-90">{t.discover.intro}</p>
        <div className="mt-6">
          <GlobalStatsGrid stats={stats} t={t} locale={locale} variant="brand" />
        </div>
        <p className="mt-6 opacity-90">{t.discover.numbersNote}</p>
        <p className="mt-1 font-medium">{t.discover.closing}</p>
      </section>

      <section aria-labelledby="dedications" className="space-y-3">
        <h2 id="dedications" className="text-lg font-semibold">
          {t.discover.dedicationsTitle}
        </h2>
        <p className="text-sm text-muted">{t.discover.dedicationsBody}</p>
        {dedications.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {dedications.map((d) => (
              <li key={d.id}>
                <Card as="article" className="h-full">
                  <p className="font-medium">{dedicationLine(t, d.type, d.name)}</p>
                  {d.message ? <p className="mt-1 text-muted">{d.message}</p> : null}
                  {user ? (
                    <div className="mt-3">
                      <ReportButton targetType="dedication" targetId={d.id} />
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">{t.discover.noDedications}</p>
        )}
      </section>

      <section aria-labelledby="coming" className="space-y-3">
        <h2 id="coming" className="text-lg font-semibold">
          {t.discover.comingTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {coming.map((c) => (
            <li key={c.key}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.discover.coming[c.key].title}</CardTitle>
                  <Badge tone={c.available ? "primary" : "neutral"}>{c.available ? t.discover.available : t.discover.later}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{t.discover.coming[c.key].body}</p>
                {c.available && "href" in c ? (
                  <ButtonLink href={c.href} variant="soft" size="sm" className="mt-3">
                    {t.groups.create}
                  </ButtonLink>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
