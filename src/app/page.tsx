import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { GlobalStatsGrid } from "@/components/app/GlobalStats";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { getGlobalStats, type GlobalStats } from "@/server/services/stats";

async function safeStats(): Promise<GlobalStats | null> {
  try {
    return await getGlobalStats();
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");
  const { t, locale } = await getI18n();
  const stats = await safeStats();
  const steps: Array<{ key: keyof typeof t.landing.steps; icon: IconName }> = [
    { key: "create", icon: "plus" },
    { key: "invite", icon: "share" },
    { key: "read", icon: "book" },
    { key: "complete", icon: "check" },
  ];
  const faq = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ButtonLink href="/login" variant="ghost" size="sm">
            {t.common.signIn}
          </ButtonLink>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center sm:px-8 sm:pt-20">
          <LogoMark size={72} className="animate-fade-in mx-auto" />
          <h1 className="animate-fade-in mt-8 text-4xl font-semibold tracking-tight sm:text-6xl">{t.landing.heroTitle}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">{t.landing.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/welcome" size="lg">
              {t.landing.ctaPrimary}
            </ButtonLink>
            <ButtonLink href="/quran" size="lg" variant="secondary">
              <Icon name="book" />
              {t.landing.ctaSecondary}
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm font-medium text-accent-text">{t.landing.oneQuran}</p>
        </section>

        <section aria-labelledby="how" className="bg-surface py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <h2 id="how" className="text-center text-3xl font-semibold tracking-tight">
              {t.landing.howTitle}
            </h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.key} className="rounded-[var(--radius-card)] border border-line bg-bg p-6">
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary-soft text-xl text-primary-soft-text">
                    <Icon name={s.icon} />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">
                    <span className="me-2 text-accent-text">{i + 1}.</span>
                    {t.landing.steps[s.key].title}
                  </h3>
                  <p className="mt-2 text-muted">{t.landing.steps[s.key].body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="why" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 id="why" className="text-3xl font-semibold tracking-tight">
                {t.landing.whyTitle}
              </h2>
              <p className="mt-4 text-lg text-muted">{t.landing.whyBody}</p>
            </div>
            <ul className="space-y-3">
              {(["calm", "simple", "private"] as const).map((k) => (
                <li key={k} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
                  <Icon name="check" className="mt-1 shrink-0 text-primary" />
                  <span>{t.landing.whyPoints[k]}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {stats ? (
          <section aria-labelledby="impact" className="bg-primary py-16 text-on-primary">
            <div className="mx-auto max-w-6xl px-4 sm:px-8">
              <h2 id="impact" className="text-3xl font-semibold tracking-tight">
                {t.landing.impactTitle}
              </h2>
              <p className="mt-2 opacity-90">{t.landing.impactBody}</p>
              <div className="mt-8">
                <GlobalStatsGrid stats={stats} t={t} locale={locale} variant="brand" />
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="dedicate" className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
          <Icon name="heart" className="mx-auto text-3xl text-accent-text" />
          <h2 id="dedicate" className="mt-4 text-3xl font-semibold tracking-tight">
            {t.landing.dedicationTitle}
          </h2>
          <p className="mt-4 text-lg text-muted">{t.landing.dedicationBody}</p>
        </section>

        <section aria-labelledby="faq" className="bg-surface py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-8">
            <h2 id="faq" className="text-3xl font-semibold tracking-tight">
              {t.landing.faqTitle}
            </h2>
            <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-bg">
              {faq.map((n) => (
                <details key={n} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {t.landing.faq[`q${n}`]}
                    <Icon name="plus" className="shrink-0 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-muted">{t.landing.faq[`a${n}`]}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">{t.brand.tagline}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/welcome" size="lg">
              {t.landing.ctaPrimary}
            </ButtonLink>
            <ButtonLink href="/discover" size="lg" variant="secondary">
              {t.landing.explore}
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>{t.brand.humble}</p>
          <nav className="flex gap-4">
            <Link href="/about/sources" className="hover:text-text">
              {t.landing.footerSources}
            </Link>
            <Link href="/about/privacy" className="hover:text-text">
              {t.landing.footerPrivacy}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
