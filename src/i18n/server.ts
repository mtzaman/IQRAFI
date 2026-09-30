import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getCurrentSession } from "@/server/auth/current";
import { DIRECTION, fmt, getDictionary, isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./config";

/** Resolves the UI locale: account preference, then cookie, then the browser's Accept-Language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const session = await getCurrentSession();
  if (session && isLocale(session.user.language)) return session.user.language;
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return negotiateLocale((await headers()).get("accept-language"));
});

export async function getI18n() {
  const locale = await getLocale();
  return { locale, dir: DIRECTION[locale], t: getDictionary(locale), fmt };
}
