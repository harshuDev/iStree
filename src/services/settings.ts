import { supabase, unwrap, unwrapMaybe } from '../lib/supabase';
import type { UserSettings, UserSettingsUpdate } from '../lib/database.types';

export async function getSettings(): Promise<UserSettings> {
  const existing = unwrapMaybe(await supabase.from('user_settings').select('*').maybeSingle());
  if (existing) return existing;
  // The sign-up trigger normally creates this row; this covers accounts made
  // before the migration ran.
  return unwrap(await supabase.from('user_settings').insert({}).select('*').single());
}

export async function updateSettings(patch: UserSettingsUpdate): Promise<UserSettings> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  return unwrap(
    await supabase.from('user_settings').update(patch).eq('user_id', auth.user.id).select('*').single(),
  );
}
