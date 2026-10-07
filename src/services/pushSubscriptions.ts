import { supabase, unwrap } from '../lib/supabase';

export async function registerPushSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Invalid push subscription');
  unwrap(
    await supabase.rpc('register_push_subscription', {
      p_endpoint: json.endpoint,
      p_keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      p_user_agent: navigator.userAgent.slice(0, 300),
    }),
  );
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  unwrap(await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint));
}

export async function countPushSubscriptions(): Promise<number> {
  const { count, error } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Asks the Edge Function to send a test push to this user's devices. */
export async function sendTestPush(): Promise<void> {
  const { error } = await supabase.functions.invoke('send-notifications', { body: { test: true } });
  if (error) throw new Error(error.message);
}
