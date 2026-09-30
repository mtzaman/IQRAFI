import type { Dictionary } from "@/i18n/config";
import { fmt } from "@/i18n/config";
import type { DedicationType } from "@/lib/db/schema";

/** Human sentence for a dedication, e.g. "Dedicated in memory of Ahmed Khan". */
export function dedicationLine(t: Dictionary, type: DedicationType, name: string | null) {
  const lines = t.dedication.lines;
  switch (type) {
    case "in_memory":
      return name ? fmt(lines.in_memory, { name }) : lines.in_memory_unnamed;
    case "loved_one":
      return name ? fmt(lines.loved_one, { name }) : lines.loved_one_unnamed;
    case "other":
      return name ? fmt(lines.other, { name }) : lines.other_unnamed;
    default:
      return lines[type];
  }
}
