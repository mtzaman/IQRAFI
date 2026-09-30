"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DIRECTION, fmt, getDictionary, type Locale } from "./config";

const I18nContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const locale = useContext(I18nContext);
  return { locale, dir: DIRECTION[locale], t: getDictionary(locale), fmt };
}
