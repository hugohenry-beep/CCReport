import type { ReportSnapshot } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TilingRange {
  start: Date;
  end: Date;
}

export interface Tiling {
  snapshots: ReportSnapshot[];
}

/**
 * Decide whether the supplied stored snapshots cleanly tile the requested
 * range. "Cleanly" means: contiguous coverage from `range.start` to `range.end`
 * with no gaps and no overlaps, allowing each edge to slip by up to
 * `toleranceMs`. Returns the selected snapshots in chronological order, or
 * `null` when no clean tiling exists.
 *
 * Algorithm (greedy):
 *   1. Sort candidates by periodStart asc; ties prefer the most recently
 *      created snapshot.
 *   2. Walk a cursor from range.start. At each step pick the candidate whose
 *      periodStart is within toleranceMs of the cursor; if multiple qualify,
 *      pick the one whose start is closest.
 *   3. Advance the cursor to (chosen.periodEnd + 1 day) — adjacent stored
 *      periods abut at the day boundary because periodEnd is stored as
 *      23:59:59.999.
 *   4. Success when the last chosen snapshot's periodEnd is within toleranceMs
 *      of range.end. Failure if we run out of candidates first or if two
 *      chosen snapshots overlap by more than toleranceMs.
 */
export function findTiling(
  candidates: ReportSnapshot[],
  range: TilingRange,
  toleranceMs: number = DAY_MS,
): Tiling | null {
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => {
    const startDiff = a.periodStart.getTime() - b.periodStart.getTime();
    if (startDiff !== 0) return startDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const chosen: ReportSnapshot[] = [];
  let cursor = range.start.getTime();

  while (true) {
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const cand = sorted[i];
      if (chosen.includes(cand)) continue;
      const diff = Math.abs(cand.periodStart.getTime() - cursor);
      if (diff > toleranceMs) continue;
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) return null;

    const pick = sorted[bestIdx];
    if (chosen.length > 0) {
      const prev = chosen[chosen.length - 1];
      // Reject overlap larger than tolerance: pick.periodStart should be after
      // prev.periodEnd (or within tolerance of the day-boundary join).
      const overlap = prev.periodEnd.getTime() - pick.periodStart.getTime();
      if (overlap > toleranceMs) return null;
    }
    chosen.push(pick);

    if (Math.abs(pick.periodEnd.getTime() - range.end.getTime()) <= toleranceMs) {
      return { snapshots: chosen };
    }
    cursor = pick.periodEnd.getTime() + DAY_MS;
    if (cursor - range.end.getTime() > toleranceMs) return null;
  }
}
