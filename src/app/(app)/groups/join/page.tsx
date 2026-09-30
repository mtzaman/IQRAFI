import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { getI18n } from "@/i18n/server";
import { JoinForm } from "./JoinForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.groups.joinTitle };
}

export default async function JoinPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.groups.joinTitle}</h1>
      <Card>
        <p className="mb-4 text-muted">{t.groups.joinBody}</p>
        <JoinForm />
      </Card>
    </div>
  );
}
