/**
 * IQRAFI assignment engine — pure, deterministic, framework-free.
 *
 * Distributes the 30 Juz of one Khatma across the members of a group:
 *  - every Juz is assigned exactly once (never omitted, never duplicated),
 *  - workload differs by at most one Juz between readers,
 *  - each reader receives a contiguous block so they read in mushaf order,
 *  - with rotation enabled, each new cycle shifts readers to the next block,
 *    so people gradually experience different parts of the Qur'an,
 *  - with more than 30 members, 30 readers take one Juz each and the "resting"
 *    readers rotate from cycle to cycle so everyone gets a turn.
 */

export const TOTAL_JUZ = 30;
export const JUZ_NUMBERS: readonly number[] = Array.from({ length: TOTAL_JUZ }, (_, i) => i + 1);

export interface EngineMember {
  userId: string;
}

export interface DistributionOptions {
  /** 1-based Khatma cycle number within the group. */
  cycleNumber: number;
  rotate: boolean;
}

export interface JuzAssignment {
  juzNumber: number;
  userId: string;
}

export interface Distribution {
  assignments: JuzAssignment[];
  /** Members who have no Juz this cycle (only when there are more than 30 members). */
  resting: string[];
}

/** Splits 30 Juz into `readers` contiguous blocks whose sizes differ by at most one. */
export function blockSizes(readers: number): number[] {
  if (!Number.isInteger(readers) || readers < 1) throw new RangeError("At least one reader is required");
  const n = Math.min(readers, TOTAL_JUZ);
  const base = Math.floor(TOTAL_JUZ / n);
  const extra = TOTAL_JUZ % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n;
}

/**
 * Computes a full distribution for one Khatma cycle.
 * `members` must be supplied in a stable order (e.g. by join date) so that rotation is predictable.
 */
export function distributeJuz(members: readonly EngineMember[], options: DistributionOptions): Distribution {
  const unique = [...new Map(members.map((m) => [m.userId, m])).values()];
  if (unique.length === 0) throw new RangeError("Cannot distribute a Khatma without members");
  if (!Number.isInteger(options.cycleNumber) || options.cycleNumber < 1) throw new RangeError("cycleNumber must be a positive integer");

  const shift = options.rotate ? options.cycleNumber - 1 : 0;
  const assignments: JuzAssignment[] = [];

  if (unique.length <= TOTAL_JUZ) {
    const sizes = blockSizes(unique.length);
    const starts: number[] = [];
    sizes.reduce((start, size) => (starts.push(start), start + size), 1);
    unique.forEach((member, i) => {
      const block = mod(i + shift, unique.length);
      const start = starts[block]!;
      const size = sizes[block]!;
      for (let juz = start; juz < start + size; juz++) assignments.push({ juzNumber: juz, userId: member.userId });
    });
    return { assignments: sortByJuz(assignments), resting: [] };
  }

  // More readers than Juz: a rotating window of 30 readers each receives one Juz.
  const offset = mod(shift * TOTAL_JUZ, unique.length);
  const active = new Set<string>();
  for (let k = 0; k < TOTAL_JUZ; k++) {
    const member = unique[mod(offset + k, unique.length)]!;
    active.add(member.userId);
    assignments.push({ juzNumber: k + 1, userId: member.userId });
  }
  return { assignments, resting: unique.filter((m) => !active.has(m.userId)).map((m) => m.userId) };
}

/**
 * Distributes an arbitrary set of Juz (e.g. the not-yet-started Juz of a running Khatma)
 * across members as evenly as possible, keeping each member's share contiguous.
 */
export function distributeSubset(juzNumbers: readonly number[], members: readonly EngineMember[]): JuzAssignment[] {
  const list = [...new Set(juzNumbers)].sort((a, b) => a - b);
  const unique = [...new Map(members.map((m) => [m.userId, m])).values()];
  if (list.length === 0) return [];
  if (unique.length === 0) throw new RangeError("Cannot distribute Juz without members");
  const readers = Math.min(unique.length, list.length);
  const base = Math.floor(list.length / readers);
  const extra = list.length % readers;
  const result: JuzAssignment[] = [];
  let cursor = 0;
  for (let i = 0; i < readers; i++) {
    const size = base + (i < extra ? 1 : 0);
    for (const juzNumber of list.slice(cursor, cursor + size)) result.push({ juzNumber, userId: unique[i]!.userId });
    cursor += size;
  }
  return result;
}

function sortByJuz(list: JuzAssignment[]) {
  return list.sort((a, b) => a.juzNumber - b.juzNumber);
}

/** Verifies the core invariant: every Juz 1..30 appears exactly once. Returns problems found. */
export function verifyDistribution(assignments: readonly { juzNumber: number }[]): string[] {
  const problems: string[] = [];
  const counts = new Map<number, number>();
  for (const a of assignments) counts.set(a.juzNumber, (counts.get(a.juzNumber) ?? 0) + 1);
  for (const juz of JUZ_NUMBERS) {
    const c = counts.get(juz) ?? 0;
    if (c === 0) problems.push(`Juz ${juz} is not assigned`);
    if (c > 1) problems.push(`Juz ${juz} is assigned ${c} times`);
  }
  for (const juz of counts.keys()) if (juz < 1 || juz > TOTAL_JUZ) problems.push(`Invalid Juz ${juz}`);
  return problems;
}

/** Workload per member, useful for UI summaries and tests. */
export function workload(assignments: readonly JuzAssignment[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const a of assignments) map.set(a.userId, [...(map.get(a.userId) ?? []), a.juzNumber]);
  return map;
}
