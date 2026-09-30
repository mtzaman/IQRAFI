import type { Metadata } from "next";

export const metadata: Metadata = { title: "Qur'an text sources" };

/** Attribution and integrity information for the Qur'an text (kept in English for accuracy). */
export default function SourcesPage() {
  return (
    <>
      <h1>Qur&apos;an text sources</h1>
      <p>IQRAFI never generates, paraphrases or edits Qur&apos;anic text. The text is taken verbatim from published, attributed sources and verified before use.</p>
      <h2>Arabic text</h2>
      <p>Uthmani script, riwayah of Hafs &apos;an &apos;Asim, from The Noble Qur&apos;an Encyclopedia (quranenc.com), distributed via the open-source quran-json dataset.</p>
      <h2>English translation</h2>
      <p>Saheeh International, as distributed by the Tanzil project (tanzil.net).</p>
      <h2>Structure</h2>
      <p>Juz, Hizb, page and sajdah boundaries come from the MIT-licensed quran-meta project (Hafs).</p>
      <h2>Integrity checks</h2>
      <ul>
        <li>114 surahs, 6,236 ayahs, 30 Juz, 604 pages, 240 Hizb quarters and 15 sajdahs are verified.</li>
        <li>The 30 Juz ranges are checked to cover the whole Qur&apos;an with no gaps or overlaps.</li>
        <li>A SHA-256 checksum of the Arabic text must match a pinned, reviewed value; any single-character change fails the build.</li>
      </ul>
      <h2>A note on authority</h2>
      <p>IQRAFI is a technology product, not a source of religious authority. For tafsir, rulings or theological questions, please consult qualified scholars and trusted sources.</p>
    </>
  );
}
