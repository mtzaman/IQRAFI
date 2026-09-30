"use client";

import { useRouter } from "next/navigation";
import { startKhatmaAction } from "@/app/actions/groups";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";

export function StartAnotherButton({ groupId }: { groupId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { run, pending } = useActionRunner();
  return (
    <Button size="lg" loading={pending} onClick={() => run(() => startKhatmaAction(groupId), { onSuccess: () => router.push(`/groups/${groupId}`) })}>
      <Icon name="sparkle" />
      {t.completion.startAnother}
    </Button>
  );
}

/** Sharing is always an explicit choice; nothing is published automatically. */
export function ShareCompletion() {
  const { t } = useI18n();
  const toast = useToast();
  const share = async () => {
    const text = t.completion.shareText;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast(t.common.copied);
      }
    } catch {
      /* dismissed */
    }
  };
  return (
    <Button variant="secondary" size="lg" onClick={share}>
      <Icon name="share" />
      {t.common.share}
    </Button>
  );
}
