"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/client";
import type { ActionResult } from "@/server/actions";

/**
 * Runs a server action with pending state, human error toasts and a router refresh.
 * Errors never expose internals: codes map to warm, translated messages.
 */
export function useActionRunner() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const { t } = useI18n();

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, opts: { success?: string; onSuccess?: (data: T) => void; refresh?: boolean } = {}) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await action();
          } catch {
            result = { ok: false, error: "generic" };
          }
          if (result.ok) {
            setError(null);
            if (opts.success) toast(opts.success);
            opts.onSuccess?.(result.data);
            if (opts.refresh !== false) router.refresh();
          } else {
            const message = t.errors.codes[result.error] ?? t.errors.codes.generic;
            setError(message);
            toast(message, "error");
          }
          resolve(result);
        });
      }),
    [router, t, toast],
  );

  return { run, pending, error };
}
