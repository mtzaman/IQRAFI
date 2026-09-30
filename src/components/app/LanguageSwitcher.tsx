"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleCookieAction } from "@/app/actions/auth";
import { useI18n } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={className}>
      <span className="sr-only">{t.prefs.language}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          start(async () => {
            await setLocaleCookieAction(next);
            router.refresh();
          });
        }}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t.languages[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
