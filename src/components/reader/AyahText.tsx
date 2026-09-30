import type { Ayah } from "@/lib/quran/types";
import type { Dictionary } from "@/i18n/config";
import { fmt } from "@/i18n/config";

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]!);

/**
 * Renders ayahs exactly as stored in the verified dataset. Text is never transformed.
 * Ayahs flow like a mushaf; with translation on, each ayah becomes its own block.
 */
export function AyahList({ ayahs, surahNames, basmala, t, bookmarked }: { ayahs: Ayah[]; surahNames: Map<number, { arabic: string; transliteration: string }>; basmala: string; t: Dictionary; bookmarked: Set<number> }) {
  const groups: Ayah[][] = [];
  for (const a of ayahs) {
    const last = groups.at(-1);
    if (last && last[0]!.surah === a.surah) last.push(a);
    else groups.push([a]);
  }
  return (
    <>
      {groups.map((group) => {
        const first = group[0]!;
        const names = surahNames.get(first.surah);
        return (
          <section key={`${first.surah}-${first.ayah}`} aria-label={names ? `${names.transliteration}` : undefined} className="mb-10">
            {first.ayah === 1 ? (
              <header className="mb-6 text-center">
                <div className="mx-auto flex max-w-sm items-center gap-3 rounded-full border border-page-line px-5 py-2">
                  <span className="text-sm text-page-muted" dir="ltr">
                    {first.surah}. {names?.transliteration}
                  </span>
                  <span className="ms-auto font-[family-name:var(--font-quran)] text-xl" lang="ar" dir="rtl">
                    {names?.arabic}
                  </span>
                </div>
                {first.surah !== 1 && first.surah !== 9 ? (
                  <p className="quran-text mt-6 text-[length:calc(var(--quran-size)*0.9)]" lang="ar" aria-label={t.reader.basmalaLabel}>
                    {basmala}
                  </p>
                ) : null}
              </header>
            ) : null}
            <div className="quran-text reader-flow text-justify text-[length:var(--quran-size)]" lang="ar">
              {group.map((a) => (
                <span key={a.id} id={`ayah-${a.id}`} data-ayah-id={a.id} data-ref={`${a.surah}:${a.ayah}`} className="reader-ayah scroll-mt-32">
                  <span className="reader-arabic">{a.text}</span>{" "}
                  <button type="button" className="ayah-marker" data-ayah-button={a.id} data-num={toArabicDigits(a.ayah)} aria-label={fmt(t.reader.ayahActions, { ref: `${a.surah}:${a.ayah}` })} aria-haspopup="dialog">
                    {bookmarked.has(a.id) ? "★" : toArabicDigits(a.ayah)}
                  </button>
                  {a.sajda ? <span className="mx-1 align-middle text-[0.45em] text-accent-text">۩ {t.reader.sajda}</span> : null}{" "}
                  <span className="reader-translation" lang="en" dir="ltr">
                    <span className="me-1 text-page-muted">{a.surah}:{a.ayah}</span>
                    {a.translationEn}
                  </span>
                </span>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
