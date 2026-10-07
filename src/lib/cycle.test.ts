import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildCalendarMarks,
  computeAverages,
  diffDays,
  effectiveLengths,
  getCycleContext,
  phaseForDate,
  type CycleSettings,
} from '../../supabase/functions/_shared/cycle.ts';
import { completedCycles, summarize } from './insights';

const settings: CycleSettings = { average_cycle_length: 28, average_period_length: 5, use_computed_averages: true };

describe('day arithmetic', () => {
  it('handles month/year boundaries and DST-free math', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(diffDays('2026-03-01', '2026-02-01')).toBe(28);
  });
});

describe('averages', () => {
  it('needs two completed cycles before trusting history', () => {
    const one = [{ start_date: '2026-01-01', end_date: '2026-01-05' }, { start_date: '2026-01-31', end_date: null }];
    expect(computeAverages(one).cycleLength).toBeNull();
    expect(effectiveLengths(one, settings).source).toBe('settings');
  });

  it('averages recent cycles and ignores outliers', () => {
    const cycles = [
      { start_date: '2026-01-01', end_date: '2026-01-04' },
      { start_date: '2026-01-31', end_date: '2026-02-03' }, // 30
      { start_date: '2026-03-02', end_date: '2026-03-05' }, // 30
      { start_date: '2026-06-01', end_date: null }, // 91 → outlier ignored
    ];
    const avg = computeAverages(cycles);
    expect(avg.cycleLength).toBe(30);
    expect(avg.periodLength).toBe(4);
    expect(effectiveLengths(cycles, settings)).toEqual({ cycleLength: 30, periodLength: 4, source: 'history' });
  });

  it('respects manual override', () => {
    const cycles = [
      { start_date: '2026-01-01', end_date: null },
      { start_date: '2026-01-31', end_date: null },
      { start_date: '2026-03-02', end_date: null },
    ];
    expect(effectiveLengths(cycles, { ...settings, use_computed_averages: false }).cycleLength).toBe(28);
  });
});

describe('cycle context', () => {
  const cycles = [{ start_date: '2026-10-01', end_date: '2026-10-05' }];

  it('returns null with no history', () => {
    expect(getCycleContext([], settings, '2026-10-07')).toBeNull();
  });

  it('walks through the phases of a 28-day cycle', () => {
    const phaseOn = (d: string) => getCycleContext(cycles, settings, d)!.phase;
    expect(phaseOn('2026-10-01')).toBe('menstrual');
    expect(phaseOn('2026-10-05')).toBe('menstrual');
    expect(phaseOn('2026-10-06')).toBe('follicular');
    expect(phaseOn('2026-10-15')).toBe('ovulation'); // day 15 = ovulation
    expect(phaseOn('2026-10-20')).toBe('luteal');
  });

  it('predicts the next period, ovulation and fertile window', () => {
    const ctx = getCycleContext(cycles, settings, '2026-10-07')!;
    expect(ctx.dayOfCycle).toBe(7);
    expect(ctx.nextPeriodStart).toBe('2026-10-29');
    expect(ctx.ovulationDate).toBe('2026-10-15');
    expect(ctx.fertileStart).toBe('2026-10-10');
    expect(ctx.fertileEnd).toBe('2026-10-16');
    expect(ctx.daysUntilNextPeriod).toBe(22);
    expect(ctx.daysLate).toBe(0);
  });

  it('reports a late period', () => {
    const ctx = getCycleContext(cycles, settings, '2026-11-02')!;
    expect(ctx.daysLate).toBe(4);
    expect(ctx.nextPeriodStart).toBe('2026-11-02');
    expect(ctx.phase).toBe('luteal');
  });

  it('uses the real length for completed historical cycles', () => {
    const hist = [
      { start_date: '2026-08-01', end_date: '2026-08-05' },
      { start_date: '2026-09-04', end_date: '2026-09-08' }, // 34-day cycle → ovulation day 21
    ];
    expect(phaseForDate(hist, settings, '2026-08-21')).toBe('ovulation');
    expect(phaseForDate(hist, settings, '2026-07-01')).toBeNull();
  });
});

describe('calendar marks', () => {
  it('marks logged and predicted periods and fertile days', () => {
    const marks = buildCalendarMarks([{ start_date: '2026-10-01', end_date: '2026-10-05' }], settings, '2026-10-01', '2026-11-30', '2026-10-07');
    expect(marks.get('2026-10-03')?.period).toBe('logged');
    expect(marks.get('2026-10-15')).toMatchObject({ fertile: true, ovulation: true });
    expect(marks.get('2026-10-29')?.period).toBe('predicted');
    expect(marks.get('2026-11-12')?.ovulation).toBe(true);
    expect(marks.get('2026-10-20')).toBeUndefined();
  });
});

describe('insights', () => {
  it('summarizes completed cycles', () => {
    const points = completedCycles([
      { start_date: '2026-09-02', end_date: '2026-09-06' },
      { start_date: '2026-08-01', end_date: null },
      { start_date: '2026-10-01', end_date: null },
    ]);
    expect(points.map((p) => p.length)).toEqual([32, 29]);
    expect(summarize(points)).toMatchObject({ count: 2, avgCycle: 30.5, shortest: 29, longest: 32, avgPeriod: 5 });
  });
});
