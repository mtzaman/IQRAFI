import ar from "./dictionaries/ar";
import en, { type Dictionary } from "./dictionaries/en";
import ur from "./dictionaries/ur";

/**
 * Locale registry. Adding a language (e.g. Turkish, Bahasa Indonesia, Malay, Bengali,
 * French, Spanish, German) means adding a dictionary that satisfies `Dictionary` and one
 * entry below — TypeScript enforces that every key is translated.
 */
export const LOCALES = ["en", "ar", "ur"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "iqrafi_locale";

export const DIRECTION: Record<Locale, "ltr" | "rtl"> = { en: "ltr", ar: "rtl", ur: "rtl" };

const DICTIONARIES: Record<Locale, Dictionary> = { en, ar, ur };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Replaces {placeholders} in a message. Unknown placeholders are left visible for easier QA. */
export function fmt(message: string, vars: Record<string, string | number | null | undefined> = {}): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? match : String(v);
  });
}

export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const code = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export function formatNumber(locale: Locale, n: number) {
  return new Intl.NumberFormat(locale).format(n);
}

/** Formats a calendar date (YYYY-MM-DD) or instant in the given timezone. */
export function formatDate(locale: Locale, value: string | Date, timeZone = "UTC", style: "long" | "medium" = "long") {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00Z`) : value;
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: typeof value === "string" ? "UTC" : timeZone }).format(date);
}

export type { Dictionary };
