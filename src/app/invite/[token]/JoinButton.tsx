"use client";

import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/app/actions/groups";
import { useActionRunner } from "@/components/app/useActionRunner";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

export function JoinButton({ token }: { token: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { run, pending, error } = useActionRunner();
  return (
    <>
      <Button size="lg" className="w-full" loading={pending} onClick={() => run(() => acceptInvitationAction(token), { onSuccess: (d) => router.push(`/groups/${d.groupId}?joined=1`), refresh: false })}>
        {t.invite.join}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </>
  );
}
