import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

export function EmptyState({ icon = "book", title, body, children, className }: { icon?: IconName; title: string; body?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-6 py-10 text-center", className)}>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-2xl text-primary-soft-text">
        <Icon name={icon} />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body ? <p className="mt-1.5 max-w-sm text-muted">{body}</p> : null}
      {children ? <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}

export function ErrorState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[var(--radius-card)] border border-line bg-surface px-6 py-10 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-surface-2 text-2xl text-accent-text">
        <Icon name="heart" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} />;
}

/** Page-level loading skeleton: calm placeholder blocks, never a blank screen. */
export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-5/6" />
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const styles = { info: "bg-surface-2 text-text", error: "bg-danger-soft text-danger", success: "bg-primary-soft text-primary-soft-text" };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-[var(--radius-control)] px-4 py-3 text-sm", styles[tone])}>
      {children}
    </div>
  );
}
