import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/brand/Logo";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <LogoMark size={56} />
      <h1 className="mt-6 text-2xl font-semibold">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 max-w-sm text-muted">{t.errors.notFoundDetail}</p>
      <ButtonLink href="/" className="mt-6">
        {t.errors.goHome}
      </ButtonLink>
    </main>
  );
}
