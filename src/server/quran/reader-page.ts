import { and, between, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { getAyah, getSurahs } from "./reader";
import type { SessionUser } from "../auth/session";

/** Shared data for reader pages. */
export async function readerContext(user: SessionUser | null, firstAyahId: number, lastAyahId: number) {
  const bookmarked = user
    ? new Set(
        (await db.select({ ayahId: bookmarks.ayahId }).from(bookmarks).where(and(eq(bookmarks.userId, user.id), between(bookmarks.ayahId, firstAyahId, lastAyahId)))).map(
          (b) => b.ayahId,
        ),
      )
    : new Set<number>();
  const surahNames = new Map(getSurahs().map((s) => [s.number, { arabic: s.nameArabic, transliteration: s.nameTransliteration }]));
  // The Basmala shown above surahs is taken verbatim from 1:1 of the verified dataset.
  const basmala = getAyah(1)!.text;
  const prefs = {
    readerTheme: user?.readerTheme ?? "light",
    readerFontScale: user?.readerFontScale ?? 100,
    showTranslation: user?.showTranslation ?? false,
  } as const;
  return { bookmarked, surahNames, basmala, prefs };
}
