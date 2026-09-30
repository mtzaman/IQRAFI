import { fmt, type Dictionary } from "@/i18n/config";
import type { Schedule } from "@/lib/db/schema";

export function scheduleLabel(t: Dictionary, g: { schedule: Schedule; cycleDays: number; kind: "standard" | "ramadan" }) {
  if (g.kind === "ramadan") return t.schedule.ramadan;
  if (g.schedule === "custom") return fmt(t.schedule.customN, { n: g.cycleDays });
  return t.schedule[g.schedule];
}
