import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { AppError } from "../errors";

export async function toggleBookmark(userId: string, ayahId: number): Promise<{ bookmarked: boolean }> {
  if (!Number.isInteger(ayahId) || ayahId < 1 || ayahId > 6236) throw new AppError("validation");
  const removed = await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.ayahId, ayahId))).returning();
  if (removed.length) return { bookmarked: false };
  await db.insert(bookmarks).values({ userId, ayahId }).onConflictDoNothing();
  return { bookmarked: true };
}

export async function listBookmarks(userId: string) {
  return db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
}
