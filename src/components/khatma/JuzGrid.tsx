import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import type { Dictionary } from "@/i18n/config";
import { fmt } from "@/i18n/config";
import { ClaimButton } from "./AssignmentActions";
import Link from "next/link";

export type GridAssignment = { id: string; juzNumber: number; userId: string | null; status: string; progress: number; helpRequestedAt: Date | null };

type TileState = "completed" | "in_progress" | "pending" | "available" | "help";

const ICONS: Record<TileState, IconName> = { completed: "check", in_progress: "book", pending: "clock", available: "sparkle", help: "hand" };
const STYLES: Record<TileState, string> = {
  completed: "bg-primary text-on-primary border-primary",
  in_progress: "bg-primary-soft text-primary-soft-text border-primary/30",
  pending: "bg-surface text-text border-line",
  available: "bg-surface text-accent-text border-accent border-dashed",
  help: "bg-surface text-accent-text border-accent",
};

/**
 * The 30 Juz of a Khatma. Each tile states its status in text and icon (never colour alone).
 * Readers' names are shown to members for coordination, but no one is singled out as "behind".
 */
export function JuzGrid({
  assignments,
  viewerId,
  names,
  groupId,
  canClaimOverdue,
  t,
}: {
  assignments: GridAssignment[];
  viewerId: string;
  names: Map<string, string>;
  groupId: string;
  canClaimOverdue: boolean;
  t: Dictionary;
}) {
  return (
    <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {assignments.map((a) => {
        const state: TileState =
          a.status === "completed" ? "completed" : a.userId === null ? "available" : a.helpRequestedAt ? "help" : a.status === "in_progress" ? "in_progress" : "pending";
        const mine = a.userId === viewerId;
        const statusText = state === "in_progress" ? fmt(t.status.in_progress, { n: a.progress }) : t.group.legend[state];
        const readerName = a.userId ? (mine ? t.common.you : (names.get(a.userId) ?? t.common.reader)) : t.group.nobody;
        const claimable = !mine && a.status !== "completed" && (a.userId === null || a.helpRequestedAt !== null || canClaimOverdue);
        return (
          <li key={a.id} className={cn("flex min-h-24 flex-col justify-between rounded-2xl border p-3", STYLES[state], mine && state !== "completed" && "ring-2 ring-accent ring-offset-2 ring-offset-bg")}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">{fmt(t.common.juz, { n: a.juzNumber })}</span>
              <Icon name={ICONS[state]} className="mt-0.5 shrink-0" />
            </div>
            <div className="mt-2 space-y-0.5 text-xs">
              <p className="font-medium">{statusText}</p>
              <p className={cn("truncate", state === "completed" ? "opacity-90" : "text-muted")}>{readerName}</p>
            </div>
            {mine && a.status !== "completed" ? (
              <Link href={`/quran/juz/${a.juzNumber}?assignment=${a.id}`} className="mt-2 text-xs font-semibold underline underline-offset-2">
                {t.home.readJuz}
              </Link>
            ) : claimable ? (
              <div className="mt-2">
                <ClaimButton assignmentId={a.id} groupId={groupId} label={t.group.availableAction} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
