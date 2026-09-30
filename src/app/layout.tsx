import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource/amiri-quran/400.css";
import "@fontsource/noto-naskh-arabic/400.css";
import "@fontsource/noto-naskh-arabic/600.css";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/600.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: { default: t.meta.title, template: "%s · IQRAFI" },
    description: t.meta.description,
    applicationName: "IQRAFI",
    openGraph: { title: t.meta.title, description: t.meta.description, siteName: "IQRAFI", type: "website" },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1512" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, dir, t } = await getI18n();
  const user = await getCurrentUser();
  const cookieTheme = (await cookies()).get("iqrafi_theme")?.value;
  const theme = user?.theme ?? (cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : "system");
  return (
    <html lang={locale} dir={dir} data-theme={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow">
          {t.common.skipToContent}
        </a>
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
