import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Card, CardTitle } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getI18n } from "@/i18n/server";
import { db } from "@/lib/db";
import { userBlocks, users } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/current";
import { DeleteAccount, UnblockButton } from "./PrivacyActions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.privacy.title };
}

export default async function PrivacyPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const blocked = await db
    .select({ id: users.id, name: users.name })
    .from(userBlocks)
    .innerJoin(users, eq(users.id, userBlocks.blockedId))
    .where(eq(userBlocks.blockerId, user.id));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.privacy.title}</h1>
        <p className="mt-1 text-muted">{t.privacy.intro}</p>
      </header>
      <Card>
        <CardTitle>{t.privacy.exportTitle}</CardTitle>
        <p className="mt-1 text-muted">{t.privacy.exportBody}</p>
        <a href="/api/account/export" className={buttonClasses("secondary", "md", "mt-4")} download>
          <Icon name="download" />
          {t.privacy.exportButton}
        </a>
      </Card>
      <Card>
        <CardTitle>{t.privacy.blocked}</CardTitle>
        {blocked.length ? (
          <ul className="mt-3 divide-y divide-line">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <span>{b.name ?? t.common.reader}</span>
                <UnblockButton userId={b.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{t.privacy.noBlocked}</p>
        )}
      </Card>
      <Card className="border-danger/40">
        <CardTitle>{t.privacy.deleteTitle}</CardTitle>
        <p className="mt-1 text-muted">{t.privacy.deleteBody}</p>
        <DeleteAccount />
      </Card>
    </div>
  );
}
