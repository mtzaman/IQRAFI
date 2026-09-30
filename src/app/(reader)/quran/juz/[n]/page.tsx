import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AyahList } from "@/components/reader/AyahText";
import { ReaderShell } from "@/components/reader/ReaderShell";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { getAssignmentForViewer, getReadingProgressForJuz } from "@/server/services/home";
import { getAyahsForJuz, getJuzMeta, getSurah } from "@/server/quran/reader";
import { readerContext } from "@/server/quran/reader-page";

type Params = { params: Promise<{ n: string }>; searchParams: Promise<{ assignment?: string }> };

function parse(n: string) {
  const num = Number(n);
  return Number.isInteger(num) && num >= 1 && num <= 30 ? num : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { t, fmt } = await getI18n();
  const n = parse((await params).n);
  return { title: n ? fmt(t.reader.juzTitle, { n }) : t.reader.title };
}

export default async function JuzReaderPage({ params, searchParams }: Params) {
  const n = parse((await params).n);
  if (!n) notFound();
  const { assignment: assignmentId } = await searchParams;
  const { t, fmt } = await getI18n();
  const user = await getCurrentUser();
  const meta = getJuzMeta(n)!;
  const ayahs = getAyahsForJuz(n);
  const ctx = await readerContext(user, meta.firstAyahId, meta.lastAyahId);

  let assignment: { id: string; juzNumber: number; completed: boolean; groupName: string } | null = null;
  if (user && assignmentId && /^[0-9a-f-]{36}$/i.test(assignmentId)) {
    const row = await getAssignmentForViewer(user.id, assignmentId);
    if (row && row.assignment.juzNumber === n && row.assignment.userId === user.id && row.khatma.status === "active") {
      assignment = { id: row.assignment.id, juzNumber: n, completed: row.assignment.status === "completed", groupName: row.group.name };
    } else if (row && row.assignment.juzNumber === n && row.assignment.status === "completed" && row.assignment.completedBy === user.id) {
      assignment = { id: row.assignment.id, juzNumber: n, completed: true, groupName: row.group.name };
    }
  }
  const saved = user ? await getReadingProgressForJuz(user.id, n) : null;
  const startSurah = getSurah(meta.start.surah)!;
  const endSurah = getSurah(meta.end.surah)!;

  return (
    <ReaderShell
      title={fmt(t.reader.juzTitle, { n })}
      subtitle={startSurah.number === endSurah.number ? startSurah.nameTransliteration : `${startSurah.nameTransliteration} ${meta.start.ayah} – ${endSurah.nameTransliteration} ${meta.end.ayah}`}
      firstAyahId={meta.firstAyahId}
      lastAyahId={meta.lastAyahId}
      signedIn={!!user}
      initialAyahId={saved?.ayahId ?? null}
      prefs={ctx.prefs}
      assignment={assignment}
      storageKey={`iqrafi:pos:juz:${n}`}
      prev={n > 1 ? { href: `/quran/juz/${n - 1}`, label: t.reader.prevJuz } : null}
      next={n < 30 ? { href: `/quran/juz/${n + 1}`, label: t.reader.nextJuz } : null}
    >
      <AyahList ayahs={ayahs} surahNames={ctx.surahNames} basmala={ctx.basmala} t={t} bookmarked={ctx.bookmarked} />
    </ReaderShell>
  );
}
