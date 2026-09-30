/**
 * Read-only access to the verified Qur'an dataset.
 *
 * The dataset is immutable and small (~3 MB), so it is held in memory per server instance:
 * reader pages render without database round-trips and can be cached aggressively.
 * The same data is seeded into PostgreSQL for relational integrity (bookmarks, progress).
 */
import type { Ayah, JuzMeta, SurahMeta } from "@/lib/quran/types";
import { loadQuranDataset } from "./dataset";

export function getSurahs(): SurahMeta[] {
  return loadQuranDataset().surahs;
}

export function getSurah(number: number): SurahMeta | undefined {
  return loadQuranDataset().surahs[number - 1];
}

export function getAllJuz(): JuzMeta[] {
  return loadQuranDataset().juz;
}

export function getJuzMeta(number: number): JuzMeta | undefined {
  return loadQuranDataset().juz[number - 1];
}

export function getAyahsForJuz(number: number): Ayah[] {
  const meta = getJuzMeta(number);
  if (!meta) return [];
  return loadQuranDataset().ayahs.slice(meta.firstAyahId - 1, meta.lastAyahId);
}

export function getAyahsForSurah(number: number): Ayah[] {
  return loadQuranDataset().ayahs.filter((a) => a.surah === number);
}

export function getAyah(id: number): Ayah | undefined {
  return loadQuranDataset().ayahs[id - 1];
}

export function findAyah(surah: number, ayah: number): Ayah | undefined {
  return loadQuranDataset().ayahs.find((a) => a.surah === surah && a.ayah === ayah);
}

/** Removes Arabic diacritics and Qur'anic annotation marks and unifies letter variants, for search only. */
export function normaliseArabic(s: string): string {
  return s
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

let arabicIndex: string[] | undefined;

/**
 * Simple in-memory search over the Arabic text (diacritic-insensitive) and the English translation.
 * Designed behind a stable interface so it can later be replaced by a dedicated search service.
 */
export function searchQuran(query: string, limit = 50): { total: number; results: Ayah[] } {
  const q = query.trim();
  if (q.length < 2) return { total: 0, results: [] };
  const ds = loadQuranDataset();
  const ref = /^(\d{1,3})\s*[:.]\s*(\d{1,3})$/.exec(q);
  if (ref) {
    const hit = findAyah(Number(ref[1]), Number(ref[2]));
    return { total: hit ? 1 : 0, results: hit ? [hit] : [] };
  }
  const isArabic = /[؀-ۿ]/.test(q);
  arabicIndex ??= ds.ayahs.map((a) => normaliseArabic(a.text));
  const needle = isArabic ? normaliseArabic(q) : q.toLowerCase();
  const matches = ds.ayahs.filter((a, i) => (isArabic ? arabicIndex![i]!.includes(needle) : a.translationEn.toLowerCase().includes(needle)));
  return { total: matches.length, results: matches.slice(0, limit) };
}
