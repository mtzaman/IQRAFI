"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeOnboardingAction } from "@/app/actions/profile";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JuzRing } from "@/components/ui/Progress";
import { useI18n } from "@/i18n/client";

const CHOICES: Array<{ key: "start" | "join" | "read" | "explore"; icon: IconName; href: string; needsAccount: boolean }> = [
  { key: "start", icon: "plus", href: "/groups/new", needsAccount: true },
  { key: "join", icon: "groups", href: "/groups/join", needsAccount: true },
  { key: "read", icon: "book", href: "/quran", needsAccount: false },
  { key: "explore", icon: "compass", href: "/discover", needsAccount: false },
];

/** First-launch onboarding: four calm screens, then straight into the chosen path (sign-up if needed). */
export function Onboarding({ signedIn }: { signedIn: boolean }) {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const total = 4;

  const choose = (choice: (typeof CHOICES)[number]) => {
    if (signedIn) void completeOnboardingAction();
    router.push(choice.needsAccount && !signedIn ? `/signup?next=${encodeURIComponent(choice.href)}` : choice.href);
  };

  return (
    <main id="main" className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-soft/70 to-bg px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {fmt(t.onboarding.stepOf, { n: step + 1, total })}
          </p>
          {step < total - 1 ? (
            <button type="button" onClick={() => setStep(total - 1)} className="text-sm font-medium text-muted hover:text-text">
              {t.common.skip}
            </button>
          ) : null}
        </div>

        <div key={step} className="animate-fade-in flex flex-1 flex-col items-center justify-center py-10 text-center">
          {step === 0 ? (
            <>
              <LogoMark size={96} />
              <h1 className="mt-8 text-4xl font-semibold tracking-[0.2em]" dir="ltr">
                IQRAFI
              </h1>
              <p className="mt-3 text-xl text-muted">{t.brand.tagline}</p>
            </>
          ) : step === 1 ? (
            <>
              <JuzRing completed={21} size={200} label={t.onboarding.s2Title}>
                <span className="text-3xl font-semibold">30</span>
                <span className="text-sm text-muted">{t.common.juzShort}</span>
              </JuzRing>
              <h1 className="mt-8 text-2xl font-semibold">{t.onboarding.s2Title}</h1>
              <p className="mt-3 text-muted">{t.onboarding.s2Body}</p>
            </>
          ) : step === 2 ? (
            <>
              <div className="flex items-center gap-3 text-3xl text-primary" aria-hidden>
                <Icon name="plus" />
                <Icon name="chevronRight" className="text-muted rtl:rotate-180" />
                <Icon name="groups" />
                <Icon name="chevronRight" className="text-muted rtl:rotate-180" />
                <Icon name="book" />
              </div>
              <h1 className="mt-8 text-2xl font-semibold">{t.onboarding.s3Title}</h1>
              <p className="mt-3 text-muted">{t.onboarding.s3Body}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{t.onboarding.s4Title}</h1>
              <ul className="mt-8 w-full space-y-3">
                {CHOICES.map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => choose(c)}
                      className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-start font-medium shadow-sm transition-colors hover:bg-surface-2"
                    >
                      <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary-soft text-xl text-primary-soft-text">
                        <Icon name={c.icon} />
                      </span>
                      {t.onboarding.options[c.key]}
                      <Icon name="chevronRight" className="ms-auto text-muted rtl:rotate-180" />
                    </button>
                  </li>
                ))}
              </ul>
              {!signedIn ? (
                <p className="mt-6 text-sm text-muted">
                  {t.auth.haveAccount}{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    {t.common.signIn}
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </div>

        {step < total - 1 ? (
          <div className="flex gap-3">
            {step > 0 ? (
              <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)}>
                {t.common.back}
              </Button>
            ) : null}
            <Button size="lg" className="flex-1" onClick={() => setStep(step + 1)}>
              {step === 0 ? t.common.getStarted : t.common.next}
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
