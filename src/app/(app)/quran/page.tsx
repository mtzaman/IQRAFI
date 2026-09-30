import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { getAllJuz, getAyah, getSurah, getSurahs } from "@/server/quran/reader";
import { listBookmarks } from "@/server/services/bookmarks";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.quran.title };
}

export default async function QuranIndexPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { t, fmt, locale } = await getI18n();
  const user = await getCurrentUser();
  const surahs = getSurahs();
  const juzList = getAllJuz();
  const lastRead = user?.lastReadAyahId ? getAyah(user.lastReadAyahId) : undefined;
  const bookmarks = user ? (await listBookmarks(user.id)).slice(0, 8) : [];
  const showJuz = tab === "juz";

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.quran.title}</h1>
        <form action="/quran/search" role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            {t.quran.search}
          </label>
          <input id="q" name="q" type="search" placeholder={t.quran.searchPlaceholder} className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5" />
          <button type="submit" className="rounded-full bg-primary px-4 text-on-primary" aria-label={t.quran.search}>
            <Icon name="search" />
          </button>
        </form>
      </header>

      {lastRead ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{t.quran.continue}</p>
            <p className="font-medium">{fmt(t.quran.continueAt, { surah: getSurah(lastRead.surah)!.nameTransliteration, ayah: lastRead.ayah })}</p>
          </div>
          <ButtonLink href={`/quran/surah/${lastRead.surah}#ayah-${lastRead.id}`}>
            <Icon name="book" />
            {t.home.continueReading}
          </ButtonLink>
        </Card>
      ) : null}

      {user ? (
        <Card>
          <CardTitle>{t.quran.bookmarks}</CardTitle>
          {bookmarks.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {bookmarks.map((b) => {
                const a = getAyah(b.ayahId)!;
                return (
                  <li key={b.id}>
                    <Link href={`/quran/surah/${a.surah}#ayah-${a.id}`} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-primary-soft">
                      <Icon name="bookmark" /> {getSurah(a.surah)!.nameTransliteration} {a.surah}:{a.ayah}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">{t.quran.noBookmarks}</p>
          )}
        </Card>
      ) : null}

      <div role="tablist" className="inline-flex rounded-full border border-line bg-surface p-1">
        <Link role="tab" aria-selected={!showJuz} href="/quran" className={`rounded-full px-4 py-1.5 text-sm font-medium ${!showJuz ? "bg-primary text-on-primary" : "text-muted"}`}>
          {t.quran.surahs}
        </Link>
        <Link role="tab" aria-selected={showJuz} href="/quran?tab=juz" className={`rounded-full px-4 py-1.5 text-sm font-medium ${showJuz ? "bg-primary text-on-primary" : "text-muted"}`}>
          {t.quran.juz}
        </Link>
      </div>

      {showJuz ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {juzList.map((j) => (
            <li key={j.number}>
              <Link href={`/quran/juz/${j.number}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-soft-text">{formatNumber(locale, j.number)}</span>
                <span className="min-w-0">
                  <span className="block font-medium">{fmt(t.common.juz, { n: formatNumber(locale, j.number) })}</span>
                  <span className="block truncate text-sm text-muted">{fmt(t.quran.juzStarts, { surah: getSurah(j.start.surah)!.nameTransliteration, ayah: j.start.ayah })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {surahs.map((s) => (
            <li key={s.number}>
              <Link href={`/quran/surah/${s.number}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">{formatNumber(locale, s.number)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.nameTransliteration}</span>
                  <span className="block truncate text-sm text-muted">
                    {s.nameEnglish} · {s.revelation === "meccan" ? t.quran.meccan : t.quran.medinan} · {fmt(t.quran.ayahs, { n: formatNumber(locale, s.ayahCount) })}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-quran)] text-xl" lang="ar" dir="rtl">
                  {s.nameArabic}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        {t.quran.source}{" "}
        <Link href="/about/sources" className="underline">
          {t.quran.sourceLink}
        </Link>
      </p>
    </div>
  );
}
