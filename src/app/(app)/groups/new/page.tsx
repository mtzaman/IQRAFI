import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { CreateKhatmaForm } from "./CreateKhatmaForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.create.title };
}

export default async function NewGroupPage({ searchParams }: { searchParams: Promise<{ ramadan?: string }> }) {
  const user = await requireUser();
  const { t } = await getI18n();
  const { ramadan } = await searchParams;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.create.title}</h1>
        <p className="mt-1 text-muted">{t.create.subtitle}</p>
      </header>
      <CreateKhatmaForm defaultTimezone={user.timezone} defaultRamadan={ramadan === "1"} />
    </div>
  );
}
