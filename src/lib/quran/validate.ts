/**
 * Structural validation of the Qur'an dataset.
 *
 * This never alters text; it verifies that the dataset is complete, consistent
 * and byte-identical to the pinned, reviewed version (see data/quran/SOURCES.md).
 */
import { createHash } from "node:crypto";
import type { QuranDataset } from "./types";

export const EXPECTED = {
  surahs: 114,
  ayahs: 6236,
  juz: 30,
  pages: 604,
  hizbQuarters: 240,
  sajdas: 15,
} as const;

/** SHA-256 of the Arabic text, reviewed and pinned. Any change to a single character fails validation. */
export const PINNED_ARABIC_CHECKSUM = "d3d109da7ee00c5dfa501360794420792a81ede57a664ce1f9c8fe44ad5e9c15";

export function computeArabicChecksum(ayahs: QuranDataset["ayahs"]): string {
  return createHash("sha256")
    .update(ayahs.map((a) => `${a.surah}:${a.ayah}|${a.text}`).join("\n"), "utf8")
    .digest("hex");
}

// Arabic letters, diacritics, Qur'anic annotation marks and spaces only.
// U+2009 (thin space) occurs once in the source, at 2:72, as a rendering aid; it is preserved as published.
const ARABIC_TEXT = new RegExp(
  "^[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF\\u200C\\u200D\\u2009 ]+$",
);

export function validateQuranDataset(ds: QuranDataset): string[] {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(msg);

  if (ds.surahs.length !== EXPECTED.surahs) fail(`Expected ${EXPECTED.surahs} surahs, found ${ds.surahs.length}`);
  if (ds.ayahs.length !== EXPECTED.ayahs) fail(`Expected ${EXPECTED.ayahs} ayahs, found ${ds.ayahs.length}`);
  if (ds.juz.length !== EXPECTED.juz) fail(`Expected ${EXPECTED.juz} juz, found ${ds.juz.length}`);

  ds.surahs.forEach((s, i) => {
    if (s.number !== i + 1) fail(`Surah index ${i} has number ${s.number}`);
    const count = ds.ayahs.filter((a) => a.surah === s.number).length;
    if (count !== s.ayahCount) fail(`Surah ${s.number}: expected ${s.ayahCount} ayahs, found ${count}`);
    if (!s.nameArabic || !s.nameTransliteration) fail(`Surah ${s.number} is missing a name`);
  });

  let prev: QuranDataset["ayahs"][number] | undefined;
  let sajdas = 0;
  for (const [i, a] of ds.ayahs.entries()) {
    if (a.id !== i + 1) fail(`Ayah ids must be consecutive; position ${i} has id ${a.id}`);
    if (!a.text || a.text !== a.text.trim()) fail(`Ayah ${a.surah}:${a.ayah} has empty or padded text`);
    else if (!ARABIC_TEXT.test(a.text)) fail(`Ayah ${a.surah}:${a.ayah} contains non-Arabic characters`);
    if (a.juz < 1 || a.juz > EXPECTED.juz) fail(`Ayah ${a.surah}:${a.ayah} has invalid juz ${a.juz}`);
    if (a.page < 1 || a.page > EXPECTED.pages) fail(`Ayah ${a.surah}:${a.ayah} has invalid page ${a.page}`);
    if (a.hizbQuarter < 1 || a.hizbQuarter > EXPECTED.hizbQuarters) fail(`Ayah ${a.surah}:${a.ayah} has invalid hizb quarter`);
    if (prev) {
      const sameSurah = prev.surah === a.surah && a.ayah === prev.ayah + 1;
      const nextSurah = a.surah === prev.surah + 1 && a.ayah === 1;
      if (!sameSurah && !nextSurah) fail(`Ayah order broken at ${a.surah}:${a.ayah}`);
      if (a.juz < prev.juz || a.juz > prev.juz + 1) fail(`Juz sequence broken at ${a.surah}:${a.ayah}`);
      if (a.page < prev.page || a.hizbQuarter < prev.hizbQuarter) fail(`Page/hizb sequence broken at ${a.surah}:${a.ayah}`);
    }
    if (a.sajda) sajdas++;
    prev = a;
  }
  if (sajdas !== EXPECTED.sajdas) fail(`Expected ${EXPECTED.sajdas} sajda ayahs, found ${sajdas}`);

  // Every ayah belongs to exactly one juz and the juz ranges tile the whole Qur'an.
  let expectedStart = 1;
  for (const [i, j] of ds.juz.entries()) {
    if (j.number !== i + 1) fail(`Juz index ${i} has number ${j.number}`);
    if (j.firstAyahId !== expectedStart) fail(`Juz ${j.number} starts at ${j.firstAyahId}, expected ${expectedStart}`);
    const members = ds.ayahs.filter((a) => a.juz === j.number);
    if (members[0]?.id !== j.firstAyahId || members.at(-1)?.id !== j.lastAyahId) fail(`Juz ${j.number} range mismatch`);
    expectedStart = j.lastAyahId + 1;
  }
  if (expectedStart !== EXPECTED.ayahs + 1) fail("Juz ranges do not cover the whole Qur'an");

  const checksum = computeArabicChecksum(ds.ayahs);
  if (checksum !== ds.arabicChecksum) fail("Recorded Arabic checksum does not match the text");
  if (checksum !== PINNED_ARABIC_CHECKSUM) fail(`Arabic text checksum ${checksum} differs from the pinned, reviewed checksum`);

  return errors;
}
