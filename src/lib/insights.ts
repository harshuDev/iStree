import { diffDays, phaseForDate, type CycleRecord, type CycleSettings, type ISODate, type Phase } from './cycle';
import type { DailyLog } from './database.types';

export interface CyclePoint {
  start: ISODate;
  length: number;
  periodLength: number | null;
}

/** Completed cycles (oldest first), each with its length and logged period length. */
export function completedCycles(cycles: readonly CycleRecord[]): CyclePoint[] {
  const sorted = [...cycles].sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  return sorted.slice(0, -1).map((c, i) => ({
    start: c.start_date,
    length: diffDays(sorted[i + 1].start_date, c.start_date),
    periodLength: c.end_date ? diffDays(c.end_date, c.start_date) + 1 : null,
  }));
}

export function summarize(points: CyclePoint[]) {
  const lengths = points.map((p) => p.length);
  const periods = points.map((p) => p.periodLength).filter((x): x is number => x !== null);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  return {
    count: points.length,
    avgCycle: avg(lengths),
    avgPeriod: avg(periods),
    shortest: lengths.length ? Math.min(...lengths) : null,
    longest: lengths.length ? Math.max(...lengths) : null,
  };
}

export interface CountRow {
  key: string;
  count: number;
  topPhase: Phase | null;
}

/** How often each symptom (or mood) was logged, and in which phase it shows up most. */
export function countByKey(
  logs: readonly DailyLog[],
  cycles: readonly CycleRecord[],
  settings: CycleSettings,
  pickKeys: (log: DailyLog) => string[],
): CountRow[] {
  const counts = new Map<string, { count: number; phases: Map<Phase, number> }>();
  for (const log of logs) {
    const phase = phaseForDate(cycles, settings, log.date);
    for (const key of pickKeys(log)) {
      const entry = counts.get(key) ?? { count: 0, phases: new Map() };
      entry.count++;
      if (phase) entry.phases.set(phase, (entry.phases.get(phase) ?? 0) + 1);
      counts.set(key, entry);
    }
  }
  return [...counts.entries()]
    .map(([key, { count, phases }]) => ({
      key,
      count,
      topPhase: [...phases.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface PhaseAverages {
  phase: Phase;
  days: number;
  sleep: number | null;
  water: number | null;
  energy: number | null;
}

export function averagesByPhase(
  logs: readonly DailyLog[],
  cycles: readonly CycleRecord[],
  settings: CycleSettings,
): PhaseAverages[] {
  const phases: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];
  const buckets = new Map(phases.map((p) => [p, [] as DailyLog[]]));
  for (const log of logs) {
    const phase = phaseForDate(cycles, settings, log.date);
    if (phase) buckets.get(phase)!.push(log);
  }
  const mean = (xs: (number | null)[]) => {
    const vals = xs.filter((x): x is number => x !== null).map(Number);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };
  return phases.map((phase) => {
    const ls = buckets.get(phase)!;
    return {
      phase,
      days: ls.length,
      sleep: mean(ls.map((l) => l.sleep_hours)),
      water: mean(ls.map((l) => l.water_intake)),
      energy: mean(ls.map((l) => l.energy_level)),
    };
  });
}
