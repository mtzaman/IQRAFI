import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dedicationLine } from "@/components/khatma/dedication-text";
import { LogoMark } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate, formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { listVisibleDedications } from "@/server/services/dedications";
import { getKhatmaForViewer } from "@/server/services/home";
import { DedicationPanel } from "./DedicationPanel";
import { ShareCompletion, StartAnotherButton } from "./CompletionActions";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { groupMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ khatmaId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.completion.title };
}

export default async function KhatmaPage({ params }: Params) {
  const { khatmaId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(khatmaId)) notFound();
  const user = await requireUser();
  const { t, fmt, locale } = await getI18n();
  const data = await getKhatmaForViewer(user.id, khatmaId);
  if (!data) notFound();
  const { khatma, group } = data;
  const dedications = await listVisibleDedications(user.id, khatmaId);
  const own = dedications.find((d) => d.isOwn) ?? null;
  const shared = dedications.filter((d) => !d.isOwn);
  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id), eq(groupMembers.status, "active")));
  const completed = khatma.status === "completed";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {completed ? (
        <section className="animate-fade-in rounded-[var(--radius-card)] bg-gradient-to-b from-primary-soft to-surface px-6 py-12 text-center shadow-[var(--shadow-soft)]">
          <LogoMark size={56} className="mx-auto" />
          <p className="mt-6 font-[family-name:var(--font-arabic)] text-4xl leading-relaxed" lang="ar" dir="rtl" aria-hidden>
            الحمد لله
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{t.completion.title}</h1>
          <p className="mt-3 text-lg">{t.completion.body}</p>
          <p className="mt-1 text-muted">{t.completion.prayer}</p>
          <p className="mt-4 text-sm text-muted">
            {group.name} · {fmt(t.groups.cycle, { n: khatma.cycleNumber })} ·{" "}
            {khatma.completedAt ? fmt(t.completion.completedOn, { date: formatDate(locale, khatma.completedAt, group.timezone) }) : null}
          </p>
          <p className="mt-1 text-sm text-muted">{fmt(t.completion.stats, { readers: formatNumber(locale, data.readers) })}</p>
          {own ? (
            <p className="mx-auto mt-6 max-w-md rounded-2xl bg-surface px-4 py-3 text-accent-text">
              {dedicationLine(t, own.type, own.name)}
              {own.type === "in_memory" ? <span className="block text-sm text-muted">{t.dedication.mercy}</span> : null}
            </p>
          ) : null}
        </section>
      ) : (
        <Card>
          <h1 className="text-xl font-semibold">
            {group.name} · {fmt(t.groups.cycle, { n: khatma.cycleNumber })}
          </h1>
          <p className="mt-1 text-muted">{t.completion.notCompleted}</p>
        </Card>
      )}

      <DedicationPanel
        khatmaId={khatmaId}
        existing={own ? { id: own.id, type: own.type, name: own.name, message: own.message, visibility: own.visibility } : null}
        startOpen={completed && !own}
      />

      {shared.length ? (
        <Card>
          <CardTitle>{t.dedication.groupTitle}</CardTitle>
          <ul className="mt-3 space-y-3">
            {shared.map((d) => (
              <li key={d.id} className="rounded-2xl bg-surface-2 p-4">
                <p className="font-medium">{dedicationLine(t, d.type, d.name)}</p>
                {d.message ? <p className="mt-1 text-muted">{d.message}</p> : null}
                <p className="mt-2 text-xs text-muted">
                  {d.authorName ?? t.common.reader} · <Badge>{d.visibility === "public" ? t.dedication.publicBadge : t.dedication.groupBadge}</Badge>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {completed ? (
        <div className="flex flex-wrap justify-center gap-3">
          {data.nextKhatmaId ? (
            <ButtonLink href={`/groups/${group.id}`} size="lg">
              {t.completion.viewNext}
            </ButtonLink>
          ) : can(membership?.role, "khatma.start_next") ? (
            <StartAnotherButton groupId={group.id} />
          ) : null}
          <ShareCompletion />
          <ButtonLink href={`/groups/${group.id}`} variant="secondary" size="lg">
            {t.completion.viewKhatma}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
