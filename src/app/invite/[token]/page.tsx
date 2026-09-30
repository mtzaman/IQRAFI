import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/Logo";
import { scheduleLabel } from "@/components/khatma/schedule-label";
import { ButtonLink } from "@/components/ui/Button";
import { formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { getInvitationPreview } from "@/server/services/groups";
import { JoinButton } from "./JoinButton";

type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { t } = await getI18n();
  const { token } = await params;
  const preview = await getInvitationPreview(token);
  return { title: preview ? `${t.invite.title}: ${preview.name}` : t.invite.invalidTitle, robots: { index: false } };
}

/** The shareable invitation page. Anonymous visitors sign up and return here automatically. */
export default async function InvitePage({ params }: Params) {
  const { token } = await params;
  const { t, fmt, locale } = await getI18n();
  const [preview, user] = await Promise.all([getInvitationPreview(token), getCurrentUser()]);
  const next = `/invite/${token}`;
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-primary-soft to-bg px-4 py-12">
      <div className="animate-fade-in w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center shadow-[var(--shadow-soft)]">
        <LogoMark size={52} className="mx-auto" />
        {preview ? (
          <>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-accent-text">{t.invite.title}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{preview.name}</h1>
            {preview.description ? <p className="mt-2 text-muted">{preview.description}</p> : null}
            <p className="mt-4 text-lg">{t.invite.body}</p>
            <p className="mt-2 text-sm text-muted">
              {fmt(t.invite.members, { n: formatNumber(locale, preview.memberCount) })} · {fmt(t.invite.schedule, { schedule: scheduleLabel(t, preview) })}
            </p>
            <div className="mt-8 space-y-3">
              {user ? (
                <JoinButton token={token} />
              ) : (
                <>
                  <ButtonLink href={`/signup?next=${encodeURIComponent(next)}`} size="lg" className="w-full">
                    {t.invite.signupToJoin}
                  </ButtonLink>
                  <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} variant="ghost" className="w-full">
                    {t.invite.loginToJoin}
                  </ButtonLink>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-semibold">{t.invite.invalidTitle}</h1>
            <p className="mt-2 text-muted">{t.invite.invalidBody}</p>
            <ButtonLink href={user ? "/home" : "/"} variant="secondary" className="mt-6">
              {t.errors.goHome}
            </ButtonLink>
          </>
        )}
        <p className="mt-8 text-xs text-muted">IQRAFI · {t.brand.tagline}</p>
      </div>
    </main>
  );
}
