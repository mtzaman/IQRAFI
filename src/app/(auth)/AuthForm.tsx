"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { loginAction, signupAction, type AuthFormState } from "@/app/actions/auth";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";

const noopSubscribe = () => () => undefined;

export function AuthForm({ mode, next, oauth, oauthError }: { mode: "login" | "signup"; next: string; oauth: { google: boolean; apple: boolean }; oauthError: boolean }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(mode === "login" ? loginAction : signupAction, {});
  const timezone = useSyncExternalStore(noopSubscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "UTC");
  const isSignup = mode === "signup";
  const errorMessage = state.error ? (t.errors.codes[state.error] ?? t.errors.codes.generic) : null;
  const fieldError = (name: string) => {
    const code = state.fields?.[name];
    if (!code) return null;
    if (code === "password_too_short") return t.auth.passwordHint;
    return t.errors.codes.validation;
  };
  const nextQuery = next !== "/home" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <Card className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">{isSignup ? t.auth.signupTitle : t.auth.loginTitle}</h1>
      <p className="mt-1 text-muted">{isSignup ? t.auth.signupSubtitle : t.auth.loginSubtitle}</p>
      {next.startsWith("/invite/") ? <p className="mt-2 text-sm text-accent-text">{t.auth.joinAfter}</p> : null}

      {oauth.google || oauth.apple ? (
        <div className="mt-6 space-y-2">
          {oauth.google ? (
            <a href={`/auth/google?next=${encodeURIComponent(next)}`} className={buttonClasses("secondary", "md", "w-full")}>
              {t.auth.google}
            </a>
          ) : null}
          {oauth.apple ? (
            <a href={`/auth/apple?next=${encodeURIComponent(next)}`} className={buttonClasses("secondary", "md", "w-full")}>
              {t.auth.apple}
            </a>
          ) : null}
          <p className="py-2 text-center text-sm text-muted">{t.auth.or}</p>
        </div>
      ) : null}
      {oauthError ? (
        <div className="mt-4">
          <Alert tone="error">{t.auth.oauthFailed}</Alert>
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="timezone" value={timezone} />
        {isSignup ? (
          <Field label={t.auth.name} htmlFor="name" hint={t.auth.nameHint} optionalLabel={t.common.optional}>
            <Input id="name" name="name" autoComplete="name" maxLength={80} defaultValue={state.values?.name} />
          </Field>
        ) : null}
        <Field label={t.auth.email} htmlFor="email" error={fieldError("email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" defaultValue={state.values?.email} aria-invalid={!!fieldError("email")} />
        </Field>
        <Field label={t.auth.password} htmlFor="password" hint={isSignup ? t.auth.passwordHint : undefined} error={fieldError("password")}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
            dir="ltr"
            aria-invalid={!!fieldError("password")}
          />
        </Field>
        {isSignup ? <Checkbox name="analytics" label={t.prefs.analytics} hint={t.prefs.analyticsHint} /> : null}
        {errorMessage && state.error !== "validation" ? <Alert tone="error">{errorMessage}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {isSignup ? t.auth.submitSignup : t.auth.submitLogin}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link href={`${isSignup ? "/login" : "/signup"}${nextQuery}`} className="font-medium text-primary underline-offset-2 hover:underline">
          {isSignup ? t.common.signIn : t.common.signUp}
        </Link>
      </p>
    </Card>
  );
}
