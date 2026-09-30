import { readFileSync } from "node:fs";
import { validateQuranDataset } from "../../src/lib/quran/validate";
import type { QuranDataset } from "../../src/lib/quran/types";

const ds = JSON.parse(readFileSync("data/quran/quran.json", "utf8")) as QuranDataset;
const errors = validateQuranDataset(ds);
if (errors.length) {
  console.error(`Qur'an dataset validation FAILED (${errors.length} problems):`);
  for (const e of errors.slice(0, 50)) console.error(" -", e);
  process.exit(1);
}
console.log(`Qur'an dataset valid: ${ds.surahs.length} surahs, ${ds.ayahs.length} ayahs, ${ds.juz.length} juz. Checksum ${ds.arabicChecksum}`);
