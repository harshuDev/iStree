// Pure cycle math shared by the web app (via src/lib/cycle.ts) and the
// scheduled Edge Function. No imports, so it runs unchanged in Vite and Deno.
//
// Dates are ISO calendar strings ("YYYY-MM-DD") and all arithmetic is done on
// whole days in UTC, so results never shift with the device's timezone.
//
// Predictions use the common calendar method: ovulation ≈ 14 days before the
// next period, fertile window = 5 days before ovulation through 1 day after.
// This is an estimate for wellbeing reminders, not contraception or diagnosis.

export type ISODate = string;
export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleRecord {
  start_date: ISODate;
  end_date: ISODate | null;
}

export interface CycleSettings {
  average_cycle_length: number;
  average_period_length: number;
  use_computed_averages: boolean;
}

export const LUTEAL_LENGTH = 14;
export const MIN_CYCLE = 15;
export const MAX_CYCLE = 60;
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Day arithmetic
// ---------------------------------------------------------------------------

export function toDayNumber(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNumber(day: number): ISODate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Whole days from `b` to `a` (a - b). */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(a) - toDayNumber(b);
}

/** Today's calendar date in an IANA timezone (defaults to the runtime's zone). */
export function todayInTimeZone(timeZone?: string, now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// ---------------------------------------------------------------------------
// Averages
// ---------------------------------------------------------------------------

function sortAsc<T extends CycleRecord>(cycles: readonly T[]): T[] {
  return [...cycles].sort((a, b) => toDayNumber(a.start_date) - toDayNumber(b.start_date));
}

export interface ComputedAverages {
  cycleLength: number | null;
  periodLength: number | null;
  cycleSamples: number[];
  periodSamples: number[];
}

/** Averages from the most recent `window` completed cycles, ignoring outliers. */
export function computeAverages(cycles: readonly CycleRecord[], window = 6): ComputedAverages {
  const sorted = sortAsc(cycles);
  const cycleSamples: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = diffDays(sorted[i].start_date, sorted[i - 1].start_date);
    if (len >= MIN_CYCLE && len <= MAX_CYCLE) cycleSamples.push(len);
  }
  const periodSamples = sorted
    .filter((c) => c.end_date)
    .map((c) => diffDays(c.end_date as ISODate, c.start_date) + 1)
    .filter((len) => len >= 1 && len <= 15);

  const recentCycles = cycleSamples.slice(-window);
  const recentPeriods = periodSamples.slice(-window);
  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

  return {
    // Require two completed cycles before trusting the computed cycle length.
    cycleLength: recentCycles.length >= 2 ? mean(recentCycles) : null,
    periodLength: mean(recentPeriods),
    cycleSamples,
    periodSamples,
  };
}

export interface EffectiveLengths {
  cycleLength: number;
  periodLength: number;
  source: 'history' | 'settings';
}

export function effectiveLengths(cycles: readonly CycleRecord[], settings: CycleSettings): EffectiveLengths {
  if (settings.use_computed_averages) {
    const avg = computeAverages(cycles);
    if (avg.cycleLength !== null) {
      return {
        cycleLength: avg.cycleLength,
        periodLength: avg.periodLength ?? settings.average_period_length,
        source: 'history',
      };
    }
  }
  return {
    cycleLength: settings.average_cycle_length,
    periodLength: settings.average_period_length,
    source: 'settings',
  };
}

// ---------------------------------------------------------------------------
// Phase + predictions
// ---------------------------------------------------------------------------

/** Day offset (0-based from cycle start) of estimated ovulation. */
function ovulationOffset(cycleLength: number, periodLength: number): number {
  // Keep ovulation after the period even for very short cycles.
  return Math.max(cycleLength - LUTEAL_LENGTH, periodLength + 1);
}

export interface CycleContext {
  today: ISODate;
  currentStart: ISODate;
  dayOfCycle: number; // 1-based
  phase: Phase;
  cycleLength: number;
  periodLength: number;
  lengthSource: EffectiveLengths['source'];
  periodEnd: ISODate; // logged or estimated end of the current period
  ovulationDate: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
  nextPeriodStart: ISODate;
  daysUntilNextPeriod: number; // 0 = expected today; negative never (see daysLate)
  daysLate: number; // > 0 when the predicted start has passed with no new period logged
}

function phaseAt(offset: number, periodEndOffset: number, ovOffset: number): Phase {
  if (offset <= periodEndOffset) return 'menstrual';
  if (offset >= ovOffset - 1 && offset <= ovOffset + 1) return 'ovulation';
  if (offset < ovOffset - 1) return 'follicular';
  return 'luteal';
}

/** Cycle state for `today`, or null if nothing has been logged on/before today. */
export function getCycleContext(
  cycles: readonly CycleRecord[],
  settings: CycleSettings,
  today: ISODate,
): CycleContext | null {
  const sorted = sortAsc(cycles).filter((c) => toDayNumber(c.start_date) <= toDayNumber(today));
  const current = sorted[sorted.length - 1];
  if (!current) return null;

  const { cycleLength, periodLength, source } = effectiveLengths(cycles, settings);
  const offset = diffDays(today, current.start_date);
  const periodEnd = current.end_date ?? addDays(current.start_date, periodLength - 1);
  const periodEndOffset = diffDays(periodEnd, current.start_date);
  const ovOffset = ovulationOffset(cycleLength, periodLength);

  const predictedStart = addDays(current.start_date, cycleLength);
  const daysLate = Math.max(0, diffDays(today, predictedStart));
  const nextPeriodStart = daysLate > 0 ? today : predictedStart;

  return {
    today,
    currentStart: current.start_date,
    dayOfCycle: offset + 1,
    phase: phaseAt(offset, periodEndOffset, ovOffset),
    cycleLength,
    periodLength,
    lengthSource: source,
    periodEnd,
    ovulationDate: addDays(current.start_date, ovOffset),
    fertileStart: addDays(current.start_date, ovOffset - 5),
    fertileEnd: addDays(current.start_date, ovOffset + 1),
    nextPeriodStart,
    daysUntilNextPeriod: diffDays(nextPeriodStart, today),
    daysLate,
  };
}

/** Phase on an arbitrary date, using the cycle that contains it. */
export function phaseForDate(
  cycles: readonly CycleRecord[],
  settings: CycleSettings,
  date: ISODate,
): Phase | null {
  const sorted = sortAsc(cycles);
  const idx = sorted.findLastIndex((c) => toDayNumber(c.start_date) <= toDayNumber(date));
  if (idx === -1) return null;
  const cycle = sorted[idx];
  const next = sorted[idx + 1];
  const eff = effectiveLengths(cycles, settings);
  // For completed cycles use the real length so historical phases are accurate.
  const cycleLength = next ? diffDays(next.start_date, cycle.start_date) : eff.cycleLength;
  const periodEnd = cycle.end_date ?? addDays(cycle.start_date, eff.periodLength - 1);
  return phaseAt(
    diffDays(date, cycle.start_date),
    diffDays(periodEnd, cycle.start_date),
    ovulationOffset(cycleLength, eff.periodLength),
  );
}

export interface DayMark {
  period?: 'logged' | 'predicted';
  fertile?: boolean;
  ovulation?: boolean;
}

/**
 * Calendar annotations for [from, to]: logged periods, the current cycle's
 * fertile window, and `futureCycles` predicted cycles after it.
 */
export function buildCalendarMarks(
  cycles: readonly CycleRecord[],
  settings: CycleSettings,
  from: ISODate,
  to: ISODate,
  today: ISODate,
  futureCycles = 6,
): Map<ISODate, DayMark> {
  const marks = new Map<ISODate, DayMark>();
  const fromN = toDayNumber(from);
  const toN = toDayNumber(to);
  const mark = (date: ISODate, patch: DayMark) => {
    const n = toDayNumber(date);
    if (n < fromN || n > toN) return;
    marks.set(date, { ...marks.get(date), ...patch });
  };
  const markRange = (start: ISODate, end: ISODate, patch: DayMark | ((d: ISODate) => DayMark)) => {
    for (let n = Math.max(toDayNumber(start), fromN); n <= Math.min(toDayNumber(end), toN); n++) {
      const d = fromDayNumber(n);
      mark(d, typeof patch === 'function' ? patch(d) : patch);
    }
  };

  const { periodLength } = effectiveLengths(cycles, settings);
  const sorted = sortAsc(cycles);

  sorted.forEach((c) => {
    const end = c.end_date ?? addDays(c.start_date, periodLength - 1);
    markRange(c.start_date, end, (d) => ({
      period: !c.end_date && toDayNumber(d) > toDayNumber(today) ? 'predicted' : 'logged',
    }));
  });

  const ctx = getCycleContext(cycles, settings, today);
  if (!ctx) return marks;

  markRange(ctx.fertileStart, ctx.fertileEnd, { fertile: true });
  mark(ctx.ovulationDate, { ovulation: true });

  const ovOffset = diffDays(ctx.ovulationDate, ctx.currentStart);
  for (let k = 0; k < futureCycles; k++) {
    const start = addDays(ctx.nextPeriodStart, k * ctx.cycleLength);
    markRange(start, addDays(start, ctx.periodLength - 1), (d) =>
      marks.get(d)?.period === 'logged' ? {} : { period: 'predicted' },
    );
    const ov = addDays(start, ovOffset);
    markRange(addDays(ov, -5), addDays(ov, 1), { fertile: true });
    mark(ov, { ovulation: true });
  }
  return marks;
}

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
};
