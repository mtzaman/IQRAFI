import { describe, expect, it } from "vitest";
import { blockSizes, distributeJuz, verifyDistribution, workload, TOTAL_JUZ } from "@/lib/khatma/engine";

const members = (n: number) => Array.from({ length: n }, (_, i) => ({ userId: `u${i + 1}` }));

describe("assignment engine", () => {
  it.each([1, 2, 3, 4, 5, 7, 10, 11, 15, 20, 29, 30, 31, 45, 60, 100])("assigns every Juz exactly once for %i member(s)", (n) => {
    for (const rotate of [true, false]) {
      for (const cycleNumber of [1, 2, 3, 17]) {
        const { assignments, resting } = distributeJuz(members(n), { cycleNumber, rotate });
        expect(assignments).toHaveLength(TOTAL_JUZ);
        expect(verifyDistribution(assignments)).toEqual([]);
        const load = workload(assignments);
        const sizes = [...load.values()].map((j) => j.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(load.size + resting.length).toBe(n);
        expect(load.size).toBe(Math.min(n, TOTAL_JUZ));
      }
    }
  });

  it.each([
    [1, [30]],
    [2, [15, 15]],
    [3, [10, 10, 10]],
    [5, [6, 6, 6, 6, 6]],
    [10, Array(10).fill(3)],
    [15, Array(15).fill(2)],
    [30, Array(30).fill(1)],
  ])("gives the expected workload for %i members", (n, expected) => {
    expect(blockSizes(n)).toEqual(expected);
  });

  it("gives uneven groups blocks that differ by at most one Juz", () => {
    expect(blockSizes(4)).toEqual([8, 8, 7, 7]);
    expect(blockSizes(7)).toEqual([5, 5, 4, 4, 4, 4, 4]);
    expect(blockSizes(31)).toHaveLength(30);
  });

  it("gives each reader a contiguous block in mushaf order", () => {
    const { assignments } = distributeJuz(members(3), { cycleNumber: 1, rotate: true });
    const load = workload(assignments);
    expect(load.get("u1")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(load.get("u2")).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(load.get("u3")).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  });

  it("rotates readers to the next Juz each cycle (30 members)", () => {
    const c1 = workload(distributeJuz(members(30), { cycleNumber: 1, rotate: true }).assignments);
    const c2 = workload(distributeJuz(members(30), { cycleNumber: 2, rotate: true }).assignments);
    expect(c1.get("u1")).toEqual([1]);
    expect(c2.get("u1")).toEqual([2]);
    expect(c2.get("u30")).toEqual([1]);
  });

  it("rotates blocks for smaller groups and keeps assignments fixed without rotation", () => {
    const rotated = workload(distributeJuz(members(3), { cycleNumber: 2, rotate: true }).assignments);
    expect(rotated.get("u1")?.[0]).toBe(11);
    const fixed = workload(distributeJuz(members(3), { cycleNumber: 2, rotate: false }).assignments);
    expect(fixed.get("u1")?.[0]).toBe(1);
  });

  it("gives resting readers a turn in the next cycle when there are more than 30 members", () => {
    const c1 = distributeJuz(members(40), { cycleNumber: 1, rotate: true });
    const c2 = distributeJuz(members(40), { cycleNumber: 2, rotate: true });
    expect(c1.resting).toHaveLength(10);
    for (const id of c1.resting) expect(c2.assignments.some((a) => a.userId === id)).toBe(true);
  });

  it("ignores duplicate members and rejects invalid input", () => {
    const dup = distributeJuz([{ userId: "a" }, { userId: "a" }, { userId: "b" }], { cycleNumber: 1, rotate: false });
    expect(workload(dup.assignments).size).toBe(2);
    expect(() => distributeJuz([], { cycleNumber: 1, rotate: true })).toThrow();
    expect(() => distributeJuz(members(2), { cycleNumber: 0, rotate: true })).toThrow();
  });

  it("detects omitted or duplicated Juz", () => {
    const problems = verifyDistribution([{ juzNumber: 1 }, { juzNumber: 1 }]);
    expect(problems).toContain("Juz 1 is assigned 2 times");
    expect(problems).toContain("Juz 30 is not assigned");
  });
});

describe("subset distribution (rebalancing)", () => {
  it("spreads remaining Juz evenly and contiguously", async () => {
    const { distributeSubset } = await import("@/lib/khatma/engine");
    const result = distributeSubset([30, 5, 6, 7, 8], members(2));
    expect(workload(result).get("u1")).toEqual([5, 6, 7]);
    expect(workload(result).get("u2")).toEqual([8, 30]);
    expect(distributeSubset([1, 2], members(5))).toHaveLength(2);
    expect(distributeSubset([], members(2))).toEqual([]);
  });
});
