import { buildCalendarMarks, type CycleRecord, type CycleSettings, type ISODate, type Phase } from './cycle';

export const PHASE_ORDER: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];

export const PHASE_COLOR: Record<Phase, string> = {
  menstrual: 'var(--phase-menstrual)',
  follicular: 'var(--phase-follicular)',
  ovulation: 'var(--phase-ovulation)',
  luteal: 'var(--phase-luteal)',
};

/** Artwork + fertility wording for phase cards and detail sheets. */
export const PHASE_ART: Record<Phase, { emoji: string; bg: string; fertility: 'Low' | 'Medium' | 'High'; fertilityNote: string }> = {
  menstrual: { emoji: '🌸', bg: 'var(--period-soft)', fertility: 'Low', fertilityNote: 'Very low — your body is shedding the uterine lining.' },
  follicular: { emoji: '🌱', bg: 'var(--blue-soft)', fertility: 'Medium', fertilityNote: 'Rising as your body prepares to release an egg.' },
  ovulation: { emoji: '☀️', bg: 'var(--yellow-soft)', fertility: 'High', fertilityNote: 'Highest — this is the most fertile time of your cycle.' },
  luteal: { emoji: '🌙', bg: 'color-mix(in srgb, var(--phase-luteal) 18%, transparent)', fertility: 'Low', fertilityNote: 'Low — the fertile window has passed.' },
};

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}


/** Calendar-method chance of pregnancy on a date: estimate only, never contraception. */
export function fertilityChance(
  cycles: readonly CycleRecord[],
  settings: CycleSettings,
  date: ISODate,
  today: ISODate,
): 'Low' | 'Medium' | 'High' {
  const mark = buildCalendarMarks(cycles, settings, date, date, today).get(date);
  if (mark?.ovulation) return 'High';
  if (mark?.fertile) return 'Medium';
  return 'Low';
}
