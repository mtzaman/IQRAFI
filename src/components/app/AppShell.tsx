import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { getI18n } from "@/i18n/server";
import type { SessionUser } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { BottomNav, SideNavLinks } from "./NavLinks";

/** Responsive shell: sidebar on desktop, bottom navigation on mobile, reading-first content column. */
export async function AppShell({ user, children }: { user: SessionUser | null; children: ReactNode }) {
  const { t } = await getI18n();
  const unread = user ? await unreadCount(user.id) : 0;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-surface px-4 py-6 lg:flex">
        <Link href={user ? "/home" : "/"} className="mb-8 px-2">
          <Wordmark />
        </Link>
        <nav aria-label={t.nav.main}>
          <SideNavLinks />
        </nav>
        <div className="mt-auto space-y-3 px-2 text-sm text-muted">
          <p className="font-medium text-accent-text">{t.brand.tagline}</p>
          <p>{t.brand.humble}</p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:justify-end lg:px-8">
          <Link href={user ? "/home" : "/"} className="lg:hidden">
            <Wordmark size={26} />
          </Link>
          {user ? (
            <Link
              href="/notifications"
              className="relative rounded-full p-2.5 text-xl text-muted hover:bg-surface-2 hover:text-text"
              aria-label={unread ? `${t.nav.notifications} (${unread})` : t.nav.notifications}
            >
              <Icon name="bell" />
              {unread ? (
                <span className="absolute end-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-white" aria-hidden>
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          ) : (
            <ButtonLink href="/login" variant="secondary" size="sm">
              {t.common.signIn}
            </ButtonLink>
          )}
        </header>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:max-w-5xl lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
