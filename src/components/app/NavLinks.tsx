"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/i18n/client";

const ITEMS: Array<{ href: string; key: "home" | "groups" | "quran" | "discover" | "profile"; icon: IconName }> = [
  { href: "/home", key: "home", icon: "home" },
  { href: "/groups", key: "groups", icon: "groups" },
  { href: "/quran", key: "quran", icon: "book" },
  { href: "/discover", key: "discover", icon: "compass" },
  { href: "/profile", key: "profile", icon: "user" },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/groups" && pathname.startsWith("/khatma"));
}

/** Mobile bottom navigation: five destinations, large tap targets. */
export function BottomNav() {
  const { t } = useI18n();
  const isActive = useActive();
  return (
    <nav aria-label={t.nav.main} className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium", active ? "text-primary" : "text-muted")}
              >
                <span className={cn("rounded-full px-4 py-1 text-[1.35rem] transition-colors", active && "bg-primary-soft")}>
                  <Icon name={item.icon} />
                </span>
                {t.nav[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop sidebar navigation. */
export function SideNavLinks() {
  const { t } = useI18n();
  const isActive = useActive();
  return (
    <ul className="space-y-1">
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 font-medium transition-colors",
                active ? "bg-primary-soft text-primary-soft-text" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon name={item.icon} className="text-xl" />
              {t.nav[item.key]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
