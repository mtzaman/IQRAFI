import { readFileSync } from "node:fs";
import path from "node:path";
import type { QuranDataset } from "@/lib/quran/types";

let cached: QuranDataset | undefined;

/** Reads the verified dataset from disk (used for seeding and static metadata). */
export function loadQuranDataset(): QuranDataset {
  cached ??= JSON.parse(readFileSync(path.join(process.cwd(), "data/quran/quran.json"), "utf8")) as QuranDataset;
  return cached;
}
