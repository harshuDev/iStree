import { supabase, unwrap, unwrapMaybe } from '../lib/supabase';
import type { ISODate } from '../lib/cycle';
import type { DailyLog, DailyLogInput } from '../lib/database.types';

export async function getDailyLog(date: ISODate): Promise<DailyLog | null> {
  return unwrapMaybe(await supabase.from('daily_logs').select('*').eq('date', date).maybeSingle());
}

export async function listDailyLogs(fromDate: ISODate): Promise<DailyLog[]> {
  return unwrap(
    await supabase.from('daily_logs').select('*').gte('date', fromDate).order('date', { ascending: true }),
  );
}

export async function saveDailyLog(log: DailyLogInput): Promise<DailyLog> {
  return unwrap(
    await supabase.from('daily_logs').upsert(log, { onConflict: 'user_id,date' }).select('*').single(),
  );
}
