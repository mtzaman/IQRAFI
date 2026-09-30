import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { formatNumber } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getSurah, searchQuran } from "@/server/quran/reader";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.quran.search };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { t, fmt, locale } = await getI18n();
  const query = q.slice(0, 100);
  const { total, results } = searchQuran(query);
  return (
    <div className="space-y-6">
      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          {t.quran.search}
        </label>
        <input id="q" name="q" type="search" defaultValue={query} placeholder={t.quran.searchPlaceholder} className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5" autoFocus />
        <button type="submit" className="rounded-full bg-primary px-5 text-on-primary">
          {t.quran.search}
        </button>
      </form>
      {query.trim().length >= 2 ? <p className="text-sm text-muted">{fmt(t.quran.results, { n: formatNumber(locale, total) })}</p> : null}
      {query.trim().length >= 2 && results.length === 0 ? <EmptyState icon="search" title={t.quran.noResults} /> : null}
      <ul className="space-y-3">
        {results.map((a) => (
          <li key={a.id}>
            <Card as="article" className="space-y-3">
              <Link href={`/quran/surah/${a.surah}#ayah-${a.id}`} className="text-sm font-medium text-primary hover:underline">
                {getSurah(a.surah)!.nameTransliteration} {a.surah}:{a.ayah}
              </Link>
              <p className="quran-text text-2xl" lang="ar">
                {a.text}
              </p>
              <p className="text-muted" lang="en" dir="ltr">
                {a.translationEn}
              </p>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{t.quran.source}</p>
    </div>
  );
}
