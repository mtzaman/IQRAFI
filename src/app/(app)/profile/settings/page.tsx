import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/current";
import { SettingsForms } from "./SettingsForms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.prefs.title };
}

export default async function SettingsPage() {
  const user = await requireUser();
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.prefs.title}</h1>
      <SettingsForms
        user={{
          name: user.name,
          avatarUrl: user.avatarUrl,
          language: user.language,
          timezone: user.timezone,
          country: user.country,
          theme: user.theme,
          readerTheme: user.readerTheme,
          readerFontScale: user.readerFontScale,
          showTranslation: user.showTranslation,
          analyticsConsent: user.analyticsConsent,
          notificationPrefs: user.notificationPrefs,
          hasPassword: !!user.passwordHash,
        }}
      />
    </div>
  );
}
