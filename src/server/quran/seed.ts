import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ayahs, juz, surahs } from "@/lib/db/schema";
import { validateQuranDataset } from "@/lib/quran/validate";
import { loadQuranDataset } from "./dataset";

/**
 * Seeds Qur'an reference tables from the verified dataset. Refuses to run if validation fails.
 * Idempotent: existing rows are upserted with identical content.
 */
export async function seedQuran() {
  const ds = loadQuranDataset();
  const errors = validateQuranDataset(ds);
  if (errors.length) throw new Error(`Refusing to seed an invalid Qur'an dataset: ${errors.slice(0, 5).join("; ")}`);

  await db.transaction(async (tx) => {
    await tx
      .insert(surahs)
      .values(ds.surahs)
      .onConflictDoUpdate({
        target: surahs.number,
        set: {
          nameArabic: sql`excluded.name_arabic`,
          nameTransliteration: sql`excluded.name_transliteration`,
          nameEnglish: sql`excluded.name_english`,
          revelation: sql`excluded.revelation`,
          ayahCount: sql`excluded.ayah_count`,
        },
      });
    await tx
      .insert(juz)
      .values(ds.juz.map((j) => ({ number: j.number, firstAyahId: j.firstAyahId, lastAyahId: j.lastAyahId, ayahCount: j.ayahCount, metadata: { start: j.start, end: j.end } })))
      .onConflictDoUpdate({
        target: juz.number,
        set: { firstAyahId: sql`excluded.first_ayah_id`, lastAyahId: sql`excluded.last_ayah_id`, ayahCount: sql`excluded.ayah_count`, metadata: sql`excluded.metadata` },
      });
    for (let i = 0; i < ds.ayahs.length; i += 1000) {
      await tx
        .insert(ayahs)
        .values(ds.ayahs.slice(i, i + 1000))
        .onConflictDoUpdate({
          target: ayahs.id,
          set: {
            surah: sql`excluded.surah`,
            ayah: sql`excluded.ayah`,
            text: sql`excluded.text`,
            translationEn: sql`excluded.translation_en`,
            juz: sql`excluded.juz`,
            hizbQuarter: sql`excluded.hizb_quarter`,
            page: sql`excluded.page`,
            sajda: sql`excluded.sajda`,
          },
        });
    }
  });
  return { surahs: ds.surahs.length, juz: ds.juz.length, ayahs: ds.ayahs.length, checksum: ds.arabicChecksum };
}
