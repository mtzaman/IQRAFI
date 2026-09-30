"use client";

import { useState } from "react";
import { changePasswordAction, updatePreferencesAction, updateProfileAction } from "@/app/actions/profile";
import { TimezoneSelect } from "@/components/app/TimezoneSelect";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { useI18n } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";
import type { NotificationPrefs } from "@/lib/db/schema";

type UserSettings = {
  name: string | null;
  avatarUrl: string | null;
  language: "en" | "ar" | "ur";
  timezone: string;
  country: string | null;
  theme: "system" | "light" | "dark";
  readerTheme: "light" | "dark" | "sepia";
  readerFontScale: number;
  showTranslation: boolean;
  analyticsConsent: boolean;
  notificationPrefs: NotificationPrefs;
  hasPassword: boolean;
};

const NOTIFICATION_KEYS = ["assignmentReady", "groupProgress", "khatmaCompleted", "helpRequests"] as const;
const CHANNEL_KEYS = [
  ["inApp", "inApp"],
  ["email", "emailNotif"],
  ["push", "push"],
] as const;

export function SettingsForms({ user }: { user: UserSettings }) {
  const { t } = useI18n();
  const { run, pending, error } = useActionRunner();
  const [pwDone, setPwDone] = useState(false);

  const saveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(
      () =>
        updateProfileAction({
          name: String(f.get("name") ?? ""),
          avatarUrl: String(f.get("avatarUrl") ?? ""),
          language: String(f.get("language")),
          timezone: String(f.get("timezone")),
          country: String(f.get("country") ?? ""),
        }),
      { success: t.common.saved },
    );
  };

  const savePrefs = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const on = (k: string) => f.get(k) === "on";
    run(
      () =>
        updatePreferencesAction({
          theme: String(f.get("theme")),
          readerTheme: String(f.get("readerTheme")),
          readerFontScale: Number(f.get("readerFontScale")),
          showTranslation: on("showTranslation"),
          analyticsConsent: on("analyticsConsent"),
          notificationPrefs: {
            inApp: on("inApp"),
            email: on("email"),
            push: on("push"),
            assignmentReady: on("assignmentReady"),
            groupProgress: on("groupProgress"),
            khatmaCompleted: on("khatmaCompleted"),
            helpRequests: on("helpRequests"),
          },
        }),
      { success: t.common.saved },
    );
  };

  const savePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    run(() => changePasswordAction(user.hasPassword ? String(f.get("current") ?? "") : null, String(f.get("next") ?? "")), {
      success: t.prefs.passwordChanged,
      onSuccess: () => {
        setPwDone(true);
        form.reset();
      },
      refresh: false,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={saveProfile} className="space-y-4">
          <CardTitle>{t.prefs.profileSection}</CardTitle>
          <Field label={t.prefs.name} htmlFor="name" optionalLabel={t.common.optional}>
            <Input id="name" name="name" defaultValue={user.name ?? ""} maxLength={80} autoComplete="name" />
          </Field>
          <Field label={t.prefs.avatar} htmlFor="avatarUrl" hint={t.prefs.avatarHint}>
            <Input id="avatarUrl" name="avatarUrl" type="url" dir="ltr" defaultValue={user.avatarUrl ?? ""} placeholder="https://" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.prefs.language} htmlFor="language">
              <Select id="language" name="language" defaultValue={user.language}>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {t.languages[l]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.prefs.timezone} htmlFor="timezone">
              <TimezoneSelect id="timezone" name="timezone" defaultValue={user.timezone} />
            </Field>
          </div>
          <Field label={t.prefs.country} htmlFor="country" hint={t.prefs.countryHint}>
            <Input id="country" name="country" defaultValue={user.country ?? ""} maxLength={56} autoComplete="country-name" />
          </Field>
          <Button type="submit" disabled={pending}>
            {t.common.save}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={savePrefs} className="space-y-6">
          <div className="space-y-4">
            <CardTitle>{t.prefs.appearance}</CardTitle>
            <Field label={t.prefs.theme} htmlFor="theme">
              <Select id="theme" name="theme" defaultValue={user.theme}>
                {(["system", "light", "dark"] as const).map((th) => (
                  <option key={th} value={th}>
                    {t.prefs.themes[th]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="space-y-4">
            <CardTitle>{t.prefs.reading}</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.prefs.readerTheme} htmlFor="readerTheme">
                <Select id="readerTheme" name="readerTheme" defaultValue={user.readerTheme}>
                  {(["light", "sepia", "dark"] as const).map((th) => (
                    <option key={th} value={th}>
                      {t.reader.themes[th]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.prefs.fontScale} htmlFor="readerFontScale">
                <Select id="readerFontScale" name="readerFontScale" defaultValue={String(user.readerFontScale)}>
                  {[70, 80, 90, 100, 110, 120, 130, 140, 150, 170, 200].map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Checkbox name="showTranslation" defaultChecked={user.showTranslation} label={t.prefs.showTranslation} />
          </div>
          <fieldset className="space-y-1">
            <legend className="text-lg font-semibold">{t.prefs.notificationsSection}</legend>
            <p className="pb-2 text-sm text-muted">{t.prefs.notificationsNote}</p>
            {CHANNEL_KEYS.map(([key, label]) => (
              <Checkbox key={key} name={key} defaultChecked={user.notificationPrefs[key]} label={t.prefs[label]} />
            ))}
            <div className="my-2 border-t border-line" />
            {NOTIFICATION_KEYS.map((key) => (
              <Checkbox key={key} name={key} defaultChecked={user.notificationPrefs[key]} label={t.prefs[key]} />
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-lg font-semibold">{t.prefs.privacySection}</legend>
            <Checkbox name="analyticsConsent" defaultChecked={user.analyticsConsent} label={t.prefs.analytics} hint={t.prefs.analyticsHint} />
          </fieldset>
          <Button type="submit" disabled={pending}>
            {t.common.save}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={savePassword} className="space-y-4">
          <CardTitle>{t.prefs.password}</CardTitle>
          {user.hasPassword ? (
            <Field label={t.prefs.currentPassword} htmlFor="current">
              <Input id="current" name="current" type="password" autoComplete="current-password" dir="ltr" required />
            </Field>
          ) : null}
          <Field label={t.prefs.newPassword} htmlFor="next" hint={t.auth.passwordHint}>
            <Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} dir="ltr" required />
          </Field>
          {pwDone ? <p className="text-sm text-primary">{t.prefs.passwordChanged}</p> : null}
          {error && !pwDone ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" variant="secondary" disabled={pending}>
            {t.prefs.changePassword}
          </Button>
        </form>
      </Card>
    </div>
  );
}
