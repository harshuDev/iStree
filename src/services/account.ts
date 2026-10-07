import { supabase, unwrap, unwrapMaybe } from '../lib/supabase';

/** Everything we store about the user, as a downloadable JSON object. */
export async function exportMyData() {
  const [cycles, logs, settings] = await Promise.all([
    supabase.from('cycles').select('start_date, end_date, cycle_length, created_at').order('start_date'),
    supabase.from('daily_logs').select('*').order('date'),
    supabase.from('user_settings').select('*').maybeSingle(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    cycles: unwrap(cycles),
    daily_logs: unwrap(logs),
    settings: unwrapMaybe(settings),
  };
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
}
