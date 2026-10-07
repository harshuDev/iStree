// send-notifications
//
// Two ways to call it:
//  1. Scheduled (pg_cron every 15 min) with header `x-cron-secret: <CRON_SECRET>`.
//     For every user with notifications on, works out which reminders fall in
//     the current 15-minute window *in that user's timezone*, and sends them.
//  2. Signed-in user with `Authorization: Bearer <user JWT>` and body
//     `{ "test": true }` — sends a test push to that user's own devices.
//
// Required secrets (supabase secrets set ...): VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected by Supabase automatically.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {
  addDays,
  getCycleContext,
  phaseForDate,
  toDayNumber,
  type CycleRecord,
  type Phase,
} from '../_shared/cycle.ts';
import { reminderMessage, type ReminderKind } from '../_shared/messages.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SLOT_MINUTES = 15;
const BATCH_SIZE = 200;
const FORECAST_DAYS = [2, 0]; // heads-up 2 days before and on the predicted day

interface SettingsRow {
  user_id: string;
  timezone: string;
  average_cycle_length: number;
  average_period_length: number;
  use_computed_averages: boolean;
  morning_time: string;
  notify_phase_changes: boolean;
  notify_period_forecast: boolean;
  notify_daily_checkin: boolean;
  checkin_time: string;
  notify_hydration: boolean;
  hydration_times: string[];
  notify_sleep: boolean;
  sleep_time: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface Due {
  kind: ReminderKind;
  slot: string;
  title: string;
  body: string;
  url: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function localNow(timeZone: string, now: Date): { date: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return localNow('Asia/Kolkata', now); // invalid/unknown timezone string
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** "HH:MM[:SS]" → minutes since midnight. */
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function inQuietHours(nowMin: number, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s <= e ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e; // wraps midnight
}

// ---------------------------------------------------------------------------
// Decide which reminders are due for one user right now
// ---------------------------------------------------------------------------

function dueReminders(
  s: SettingsRow,
  cycles: CycleRecord[],
  loggedToday: boolean,
  local: { date: string; minutes: number },
): Due[] {
  const slotStart = Math.floor(local.minutes / SLOT_MINUTES) * SLOT_MINUTES;
  const isDue = (t: string) => {
    const m = toMinutes(t);
    return m >= slotStart && m < slotStart + SLOT_MINUTES;
  };
  if (inQuietHours(local.minutes, s.quiet_hours_start, s.quiet_hours_end)) return [];

  const ctx = getCycleContext(cycles, s, local.date);
  // Before any period is logged we still send generic hydration/sleep/check-in nudges.
  const phase: Phase = ctx?.phase ?? 'follicular';
  const seed = toDayNumber(local.date);
  const due: Due[] = [];
  const add = (kind: ReminderKind, slot: string, url: string, opts: { daysUntilPeriod?: number } = {}) =>
    due.push({ kind, slot, url, ...reminderMessage(kind, phase, { seed, ...opts }) });

  if (isDue(s.morning_time) && ctx) {
    if (s.notify_phase_changes) {
      const yesterday = phaseForDate(cycles, s, addDays(local.date, -1));
      if (yesterday && yesterday !== ctx.phase) add('phase_change', '', '/');
    }
    if (s.notify_period_forecast && ctx.daysLate === 0 && FORECAST_DAYS.includes(ctx.daysUntilNextPeriod)) {
      add('period_forecast', String(ctx.daysUntilNextPeriod), '/cycle', { daysUntilPeriod: ctx.daysUntilNextPeriod });
    }
  }
  if (s.notify_daily_checkin && !loggedToday && isDue(s.checkin_time)) add('checkin', '', '/check-in');
  if (s.notify_hydration) {
    for (const t of s.hydration_times) if (isDue(t)) add('hydration', t.slice(0, 5), '/check-in');
  }
  if (s.notify_sleep && isDue(s.sleep_time)) add('sleep', '', '/');

  return due;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

async function deliver(
  admin: SupabaseClient,
  subs: SubscriptionRow[],
  payload: { title: string; body: string; url: string; tag: string },
): Promise<{ sent: number; removed: number }> {
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 4, urgency: 'normal' },
        );
        sent++;
        await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', sub.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired or the user revoked permission.
          await admin.from('push_subscriptions').delete().eq('id', sub.id);
          removed++;
        } else {
          console.error('push failed', status, (err as Error).message);
        }
      }
    }),
  );
  return { sent, removed };
}

async function runScheduled(admin: SupabaseClient) {
  const now = new Date();
  const totals = { users: 0, notifications: 0, sent: 0, removed: 0 };

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data: settings, error } = await admin
      .from('user_settings')
      .select(
        'user_id, timezone, average_cycle_length, average_period_length, use_computed_averages, morning_time, notify_phase_changes, notify_period_forecast, notify_daily_checkin, checkin_time, notify_hydration, hydration_times, notify_sleep, sleep_time, quiet_hours_start, quiet_hours_end',
      )
      .eq('notifications_enabled', true)
      .order('user_id')
      .range(from, from + BATCH_SIZE - 1);
    if (error) throw error;
    if (!settings?.length) break;

    const userIds = settings.map((s) => s.user_id);
    const [{ data: subs, error: subErr }, { data: cycles, error: cycErr }] = await Promise.all([
      admin.from('push_subscriptions').select('id, user_id, endpoint, keys').in('user_id', userIds),
      admin
        .from('cycles')
        .select('user_id, start_date, end_date')
        .in('user_id', userIds)
        .gte('start_date', addDays(now.toISOString().slice(0, 10), -400)),
    ]);
    if (subErr) throw subErr;
    if (cycErr) throw cycErr;

    const locals = new Map(settings.map((s) => [s.user_id, localNow(s.timezone, now)]));
    const localDates = [...new Set([...locals.values()].map((l) => l.date))];
    const { data: logs, error: logErr } = await admin
      .from('daily_logs')
      .select('user_id, date')
      .in('user_id', userIds)
      .in('date', localDates);
    if (logErr) throw logErr;

    const subsByUser = Map.groupBy((subs ?? []) as SubscriptionRow[], (s) => s.user_id);
    const cyclesByUser = Map.groupBy(cycles ?? [], (c) => c.user_id);
    const logged = new Set((logs ?? []).map((l) => `${l.user_id}|${l.date}`));

    for (const s of settings as SettingsRow[]) {
      const userSubs = subsByUser.get(s.user_id);
      if (!userSubs?.length) continue;
      totals.users++;
      const local = locals.get(s.user_id)!;
      const due = dueReminders(s, cyclesByUser.get(s.user_id) ?? [], logged.has(`${s.user_id}|${local.date}`), local);

      for (const d of due) {
        // Claim the slot first: the unique constraint makes delivery at-most-once
        // even if two cron runs overlap.
        const { data: claimed } = await admin
          .from('notification_log')
          .upsert(
            { user_id: s.user_id, kind: d.kind, slot: d.slot, local_date: local.date },
            { onConflict: 'user_id,kind,slot,local_date', ignoreDuplicates: true },
          )
          .select('id');
        if (!claimed?.length) continue;

        totals.notifications++;
        const r = await deliver(admin, userSubs, { title: d.title, body: d.body, url: d.url, tag: `${d.kind}-${d.slot}` });
        totals.sent += r.sent;
        totals.removed += r.removed;
      }
    }
    if (settings.length < BATCH_SIZE) break;
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    webpush.setVapidDetails(requireEnv('VAPID_SUBJECT'), requireEnv('VAPID_PUBLIC_KEY'), requireEnv('VAPID_PRIVATE_KEY'));
    const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });

    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret) {
      if (cronSecret !== requireEnv('CRON_SECRET')) return json({ error: 'Forbidden' }, 403);
      return json({ ok: true, ...(await runScheduled(admin)) });
    }

    // Test push for the signed-in user.
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, keys')
      .eq('user_id', userData.user.id);
    if (!subs?.length) return json({ error: 'No push subscription for this user' }, 404);

    const result = await deliver(admin, subs as SubscriptionRow[], {
      title: 'iStree notifications are on 🌸',
      body: 'This is a test. Your phase-aware reminders will arrive like this.',
      url: '/settings',
      tag: 'test',
    });
    return json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
