import { todayInTimeZone, type ISODate } from './cycle';

export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Today's date on this device. */
export const today = (): ISODate => todayInTimeZone(deviceTimeZone());

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, { ...opts, timeZone: 'UTC' });

/** Formats an ISO calendar date without timezone drift. */
export function formatDate(date: ISODate, style: 'short' | 'long' | 'weekday' = 'short'): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (style === 'long') return fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  if (style === 'weekday') return fmt({ weekday: 'short' }).format(d);
  return fmt({ day: 'numeric', month: 'short' }).format(d);
}

export function formatMonth(year: number, month: number): string {
  return fmt({ month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, month, 1)));
}

/** "HH:MM:SS" → "HH:MM" for <input type="time">. */
export const toTimeInput = (t: string) => t.slice(0, 5);
