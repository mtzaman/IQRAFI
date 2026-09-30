import type { Metadata } from "next";
import Link from "next/link";
import { dedicationLine } from "@/components/khatma/dedication-text";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { listUserDedications } from "@/server/services/dedications";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.profile.dedications };
}

export default async function DedicationsPage() {
  const user = await requireUser();
  const { t, fmt, locale } = await getI18n();
  const rows = await listUserDedications(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.dedication.historyTitle}</h1>
      {rows.length === 0 ? (
        <EmptyState icon="heart" title={t.dedication.empty} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.dedication.id}>
              <Card as="article">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link href={`/khatma/${r.dedication.khatmaId}`} className="font-semibold hover:underline">
                    {fmt(t.dedication.historyItem, { n: r.cycleNumber, group: r.groupName })}
                  </Link>
                  <Badge>{r.dedication.visibility === "private" ? t.dedication.privateBadge : r.dedication.visibility === "group" ? t.dedication.groupBadge : t.dedication.publicBadge}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {r.khatmaStatus === "completed" && r.completedAt ? fmt(t.dedication.historyCompleted, { date: formatDate(locale, r.completedAt, user.timezone) }) : t.dedication.historyInProgress}
                </p>
                <p className="mt-3">{dedicationLine(t, r.dedication.type, r.dedication.name)}</p>
                {r.dedication.message ? <p className="mt-1 text-muted">{r.dedication.message}</p> : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
