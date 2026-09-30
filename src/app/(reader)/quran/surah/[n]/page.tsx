import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AyahList } from "@/components/reader/AyahText";
import { ReaderShell } from "@/components/reader/ReaderShell";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { getAyahsForSurah, getSurah } from "@/server/quran/reader";
import { readerContext } from "@/server/quran/reader-page";

type Params = { params: Promise<{ n: string }> };

function parse(n: string) {
  const num = Number(n);
  return Number.isInteger(num) && num >= 1 && num <= 114 ? num : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { t, fmt } = await getI18n();
  const n = parse((await params).n);
  const surah = n ? getSurah(n) : undefined;
  return { title: surah ? fmt(t.reader.surahTitle, { name: surah.nameTransliteration }) : t.reader.title };
}

export default async function SurahReaderPage({ params }: Params) {
  const n = parse((await params).n);
  if (!n) notFound();
  const { t, fmt } = await getI18n();
  const user = await getCurrentUser();
  const surah = getSurah(n)!;
  const ayahs = getAyahsForSurah(n);
  const first = ayahs[0]!.id;
  const last = ayahs.at(-1)!.id;
  const ctx = await readerContext(user, first, last);
  const prevSurah = n > 1 ? getSurah(n - 1) : undefined;
  const nextSurah = n < 114 ? getSurah(n + 1) : undefined;
  const lastRead = user?.lastReadAyahId && user.lastReadAyahId >= first && user.lastReadAyahId <= last ? user.lastReadAyahId : null;

  return (
    <ReaderShell
      title={fmt(t.reader.surahTitle, { name: surah.nameTransliteration })}
      subtitle={`${surah.nameArabic} · ${surah.nameEnglish} · ${fmt(t.quran.ayahs, { n: surah.ayahCount })}`}
      firstAyahId={first}
      lastAyahId={last}
      signedIn={!!user}
      initialAyahId={lastRead}
      prefs={ctx.prefs}
      storageKey={`iqrafi:pos:surah:${n}`}
      prev={prevSurah ? { href: `/quran/surah/${n - 1}`, label: prevSurah.nameTransliteration } : null}
      next={nextSurah ? { href: `/quran/surah/${n + 1}`, label: nextSurah.nameTransliteration } : null}
    >
      <AyahList ayahs={ayahs} surahNames={ctx.surahNames} basmala={ctx.basmala} t={t} bookmarked={ctx.bookmarked} />
    </ReaderShell>
  );
}
