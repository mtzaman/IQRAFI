import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { QuranDataset } from "@/lib/quran/types";
import { validateQuranDataset } from "@/lib/quran/validate";

const ds = JSON.parse(readFileSync("data/quran/quran.json", "utf8")) as QuranDataset;

describe("Qur'an dataset", () => {
  it("passes structural validation and matches the pinned checksum", () => {
    expect(validateQuranDataset(ds)).toEqual([]);
  });

  it("detects a single-character modification", () => {
    const tampered: QuranDataset = { ...ds, ayahs: ds.ayahs.map((a) => (a.id === 1 ? { ...a, text: a.text.replace("ٱ", "ا") } : a)) };
    expect(validateQuranDataset(tampered).some((e) => e.includes("checksum"))).toBe(true);
  });

  it("has correct Juz boundaries", () => {
    expect(ds.juz[0]?.start).toEqual({ surah: 1, ayah: 1 });
    expect(ds.juz[1]?.start).toEqual({ surah: 2, ayah: 142 });
    expect(ds.juz[29]?.start).toEqual({ surah: 78, ayah: 1 });
    expect(ds.juz[29]?.end).toEqual({ surah: 114, ayah: 6 });
  });
});
