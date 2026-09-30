# Qur'an data sources

IQRAFI **never** generates, paraphrases or edits Qur'anic text. `quran.json` is produced by
`npm run quran:build`, which only restructures the published source files below, and is
verified by `npm run quran:validate` (also run in the test suite).

| Data | Source | Distributed via | Licence / terms |
| --- | --- | --- | --- |
| Arabic text (Uthmani script, Hafs 'an 'Asim) | The Noble Qur'an Encyclopedia — https://quranenc.com | npm `quran-json@3.1.2` (`dist/quran_en.json`) | Verbatim use with attribution; text must not be altered |
| English translation | Saheeh International — https://tanzil.net/trans/en.sahih | npm `quran-json@3.1.2` | Non-commercial use with attribution (see Tanzil terms) |
| Juz, Hizb quarter, page, sajda, surah boundaries | `quran-meta@7.0.0` (Hafs) — https://github.com/quran-center/quran-meta | npm | MIT |

## Integrity checks

`src/lib/quran/validate.ts` verifies:

- 114 surahs, 6,236 ayahs, 30 Juz, 604 pages, 240 Hizb quarters, 15 sajdas
- per-surah ayah counts, consecutive ordering, monotonic Juz/page/Hizb sequences
- the 30 Juz ranges tile the entire Qur'an with no gaps or overlaps
- every ayah contains only Arabic script characters
- a SHA-256 checksum of the Arabic text matches the **pinned, reviewed** value
  (`d3d109da7ee00c5dfa501360794420792a81ede57a664ce1f9c8fe44ad5e9c15`).
  Any single-character change fails the build.

Known source detail: ayah 2:72 contains one U+2009 thin space (`فَٱدَّـٰرَ ٰٔتُمۡ`) used by
the source as a rendering aid. It is preserved exactly as published.

## Before production

Have the dataset reviewed by a qualified person against a printed Madinah mushaf, record the
review in this file, and keep the pinned checksum in sync only after such a review.
