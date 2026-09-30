export type Revelation = "meccan" | "medinan";

export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameTransliteration: string;
  nameEnglish: string;
  revelation: Revelation;
  ayahCount: number;
}

export interface JuzMeta {
  number: number;
  firstAyahId: number;
  lastAyahId: number;
  start: { surah: number; ayah: number };
  end: { surah: number; ayah: number };
  ayahCount: number;
}

export interface Ayah {
  /** Global ayah id, 1..6236 in mushaf order. */
  id: number;
  surah: number;
  ayah: number;
  text: string;
  translationEn: string;
  juz: number;
  hizbQuarter: number;
  page: number;
  sajda: boolean;
}

export interface QuranDataset {
  schemaVersion: number;
  riwaya: string;
  script: string;
  sources: Record<string, Record<string, string>>;
  arabicChecksum: string;
  surahs: SurahMeta[];
  juz: JuzMeta[];
  ayahs: Ayah[];
}
