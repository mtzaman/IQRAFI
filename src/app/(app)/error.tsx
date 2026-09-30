"use client";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return <ErrorState title={t.errors.title} body={t.errors.detail} action={<Button onClick={reset}>{t.common.tryAgain}</Button>} />;
}
