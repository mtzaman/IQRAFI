import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Logo";
import { getI18n } from "@/i18n/server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-soft/60 to-bg">
      <header className="px-4 py-5 sm:px-8">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-sm text-muted">{t.brand.tagline}</footer>
    </div>
  );
}
