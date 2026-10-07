import { supabase, unwrap } from '../lib/supabase';
import { addDays, diffDays, type ISODate } from '../lib/cycle';
import type { Cycle } from '../lib/database.types';

export async function listCycles(): Promise<Cycle[]> {
  return unwrap(await supabase.from('cycles').select('*').order('start_date', { ascending: false }).limit(60));
}

/**
 * Logs a period starting on `date`. If the previous period was never closed,
 * it is closed using the typical period length so history stays tidy.
 */
export async function logPeriodStart(date: ISODate, cycles: Cycle[], periodLength: number): Promise<void> {
  const previous = cycles.find((c) => c.start_date < date);
  if (previous && !previous.end_date) {
    const estimatedEnd = addDays(previous.start_date, periodLength - 1);
    const end = estimatedEnd < date ? estimatedEnd : addDays(date, -1);
    unwrap(await supabase.from('cycles').update({ end_date: end }).eq('id', previous.id));
  }
  unwrap(await supabase.from('cycles').insert({ start_date: date }));
}

/** Ends the period that contains `date` (the most recent cycle starting on/before it). */
export async function logPeriodEnd(date: ISODate, cycles: Cycle[]): Promise<void> {
  const cycle = cycles.find((c) => c.start_date <= date);
  if (!cycle) throw new Error('Log a period start before this date first.');
  if (diffDays(date, cycle.start_date) > 15) throw new Error('That is more than 15 days after the period started.');
  unwrap(await supabase.from('cycles').update({ end_date: date }).eq('id', cycle.id));
}

export async function updateCycle(id: string, patch: { start_date?: ISODate; end_date?: ISODate | null }) {
  unwrap(await supabase.from('cycles').update(patch).eq('id', id));
}

export async function deleteCycle(id: string) {
  unwrap(await supabase.from('cycles').delete().eq('id', id));
}
