/**
 * Builds IQRAFI's Qur'an dataset from published, attributed sources.
 *
 * NEVER generate or edit Qur'anic text here. This script only *restructures*
 * the verified source files: Arabic text is copied byte-for-byte.
 *
 * Sources (see data/quran/SOURCES.md):
 *  - Arabic Uthmani text + Saheeh International translation: npm `quran-json@3.1.2`
 *    (Uthmani text from The Noble Qur'an Encyclopedia, quranenc.com; translation via tanzil.net)
 *  - Structural metadata (Juz, Hizb quarter, page, sajda, surah info, Hafs riwaya): npm `quran-meta@7.0.0` (MIT)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import * as meta from "quran-meta/hafs";

const require = createRequire(import.meta.url);

type SourceVerse = { id: number; text: string; translation: string };
type SourceSurah = {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: "meccan" | "medinan";
  total_verses: number;
  verses: SourceVerse[];
};

const sourcePath = require.resolve("quran-json/dist/quran_en.json");
const sourceRaw = readFileSync(sourcePath);
const source = JSON.parse(sourceRaw.toString("utf8")) as SourceSurah[];
const sajdaIds = new Set<number>(meta.SajdaList.map((entry) => (Array.isArray(entry) ? entry[0] : entry) as number));

const surahs = source.map((s) => ({
  number: s.id,
  nameArabic: s.name,
  nameTransliteration: s.transliteration,
  nameEnglish: s.translation,
  revelation: s.type,
  ayahCount: s.total_verses,
}));

const ayahs: Array<{
  id: number;
  surah: number;
  ayah: number;
  text: string;
  translationEn: string;
  juz: number;
  hizbQuarter: number;
  page: number;
  sajda: boolean;
}> = [];

for (const s of source) {
  for (const v of s.verses) {
    const id = meta.findAyahIdBySurah(s.id as never, v.id as never) as number;
    ayahs.push({
      id,
      surah: s.id,
      ayah: v.id,
      text: v.text,
      translationEn: v.translation,
      juz: meta.findJuzByAyahId(id as never) as number,
      hizbQuarter: meta.findRubAlHizbByAyahId(id as never) as number,
      page: meta.findPageByAyahId(id as never) as number,
      sajda: sajdaIds.has(id),
    });
  }
}

const juz = Array.from({ length: 30 }, (_, i) => {
  const m = meta.getJuzMeta((i + 1) as never) as { first: [number, number]; last: [number, number]; firstAyahId: number; lastAyahId: number };
  return {
    number: i + 1,
    firstAyahId: m.firstAyahId,
    lastAyahId: m.lastAyahId,
    start: { surah: m.first[0], ayah: m.first[1] },
    end: { surah: m.last[0], ayah: m.last[1] },
    ayahCount: m.lastAyahId - m.firstAyahId + 1,
  };
});

const arabicChecksum = createHash("sha256")
  .update(ayahs.map((a) => `${a.surah}:${a.ayah}|${a.text}`).join("\n"), "utf8")
  .digest("hex");

const dataset = {
  schemaVersion: 1,
  riwaya: "Hafs 'an 'Asim",
  script: "Uthmani",
  sources: {
    arabic: {
      name: "The Noble Qur'an Encyclopedia (Uthmani text)",
      url: "https://quranenc.com",
      distributedVia: "npm quran-json@3.1.2",
      sourceFileSha256: createHash("sha256").update(sourceRaw).digest("hex"),
    },
    translationEn: {
      name: "Saheeh International",
      url: "https://tanzil.net/trans/en.sahih",
      distributedVia: "npm quran-json@3.1.2",
    },
    metadata: { name: "quran-meta (Hafs)", url: "https://github.com/quran-center/quran-meta", license: "MIT", version: "7.0.0" },
  },
  arabicChecksum,
  surahs,
  juz,
  ayahs,
};

const outDir = path.resolve("data/quran");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "quran.json"), JSON.stringify(dataset));
console.log(`Wrote ${ayahs.length} ayahs, ${surahs.length} surahs, ${juz.length} juz. Arabic checksum ${arabicChecksum}`);
