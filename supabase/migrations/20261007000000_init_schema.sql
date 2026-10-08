-- iStree initial schema
-- Tables: cycles, daily_logs, user_settings, push_subscriptions, notification_log
-- Every table is protected by Row Level Security so a user can only see and
-- change their own rows. `auth.users` is managed by Supabase Auth.
--
-- Safe to re-run: every statement skips or replaces what already exists.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.flow_intensity as enum ('none', 'spotting', 'light', 'medium', 'heavy');
exception when duplicate_object then null; -- already created by an earlier run
end;
$$;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- cycles: one row per period. cycle_length is the number of days from this
-- cycle's start to the next cycle's start, maintained by a trigger, and is
-- null for the current (most recent) cycle.
-- ---------------------------------------------------------------------------
create table if not exists public.cycles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date   date not null,
  end_date     date,
  cycle_length integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint cycles_end_after_start check (end_date is null or end_date >= start_date),
  constraint cycles_period_max_length check (end_date is null or end_date - start_date <= 15),
  constraint cycles_user_start_unique unique (user_id, start_date)
);

create index if not exists cycles_user_start_idx on public.cycles (user_id, start_date desc);

drop trigger if exists cycles_set_updated_at on public.cycles;
create trigger cycles_set_updated_at
before update on public.cycles
for each row execute function public.set_updated_at();

-- Recompute cycle_length for every cycle belonging to the affected user.
-- Only fires on changes to start_date (not cycle_length) so it cannot recurse.
create or replace function public.recompute_cycle_lengths()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.cycles c
  set cycle_length = sub.next_start - sub.start_date
  from (
    select id, start_date, lead(start_date) over (order by start_date) as next_start
    from public.cycles
    where user_id = affected_user
  ) sub
  where c.id = sub.id
    and c.cycle_length is distinct from (sub.next_start - sub.start_date);
  return null;
end;
$$;

drop trigger if exists cycles_recompute_lengths on public.cycles;
create trigger cycles_recompute_lengths
after insert or delete or update of start_date on public.cycles
for each row execute function public.recompute_cycle_lengths();

-- ---------------------------------------------------------------------------
-- daily_logs: one check-in per user per calendar day.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date           date not null,
  flow_intensity public.flow_intensity,
  mood           text,
  symptoms       text[] not null default '{}',
  water_intake   smallint check (water_intake between 0 and 30),       -- glasses (~250 ml)
  sleep_hours    numeric(3, 1) check (sleep_hours between 0 and 24),
  energy_level   smallint check (energy_level between 1 and 5),
  rested         boolean,                                               -- took intentional rest today
  notes          text check (char_length(notes) <= 2000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint daily_logs_user_date_unique unique (user_id, date)
);

create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, date desc);

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at
before update on public.daily_logs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_settings: one row per user, created automatically on sign-up.
-- Times are local wall-clock times interpreted in `timezone`.
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id                  uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name             text check (char_length(display_name) <= 60),
  average_cycle_length     smallint not null default 28 check (average_cycle_length between 15 and 60),
  average_period_length    smallint not null default 5 check (average_period_length between 1 and 15),
  -- When true, averages are computed from logged history (falling back to the
  -- values above until there is enough data). When false, the values above
  -- are used as a manual override.
  use_computed_averages    boolean not null default true,
  timezone                 text not null default 'UTC',

  notifications_enabled    boolean not null default false,
  morning_time             time not null default '08:30',   -- phase-change + period heads-up
  notify_phase_changes     boolean not null default true,
  notify_period_forecast   boolean not null default true,
  notify_daily_checkin     boolean not null default true,
  checkin_time             time not null default '20:00',
  notify_hydration         boolean not null default true,
  hydration_times          time[] not null default '{10:30,14:00,17:00}',
  notify_sleep             boolean not null default true,
  sleep_time               time not null default '22:00',
  quiet_hours_start        time,
  quiet_hours_end          time,

  onboarding_completed     boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint user_settings_hydration_max check (cardinality(hydration_times) <= 8)
);

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- push_subscriptions: one row per device/browser Web Push subscription.
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint      text not null unique,
  keys          jsonb not null,              -- { "p256dh": "...", "auth": "..." }
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  constraint push_subscriptions_keys_shape check (keys ? 'p256dh' and keys ? 'auth')
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- notification_log: written only by the scheduled Edge Function (service role)
-- to guarantee each reminder is sent at most once per local day.
-- ---------------------------------------------------------------------------
create table if not exists public.notification_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null,       -- e.g. 'phase_change', 'hydration', 'checkin'
  slot        text not null default '',  -- disambiguates multiple per day (e.g. '14:00')
  local_date  date not null,
  sent_at     timestamptz not null default now(),
  constraint notification_log_once unique (user_id, kind, slot, local_date)
);

create index if not exists notification_log_sent_at_idx on public.notification_log (sent_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.cycles             enable row level security;
alter table public.daily_logs         enable row level security;
alter table public.user_settings      enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log   enable row level security;

-- cycles
drop policy if exists "cycles: select own" on public.cycles;
create policy "cycles: select own" on public.cycles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "cycles: insert own" on public.cycles;
create policy "cycles: insert own" on public.cycles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "cycles: update own" on public.cycles;
create policy "cycles: update own" on public.cycles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "cycles: delete own" on public.cycles;
create policy "cycles: delete own" on public.cycles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- daily_logs
drop policy if exists "daily_logs: select own" on public.daily_logs;
create policy "daily_logs: select own" on public.daily_logs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "daily_logs: insert own" on public.daily_logs;
create policy "daily_logs: insert own" on public.daily_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "daily_logs: update own" on public.daily_logs;
create policy "daily_logs: update own" on public.daily_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "daily_logs: delete own" on public.daily_logs;
create policy "daily_logs: delete own" on public.daily_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- user_settings (row is created by trigger; insert allowed as a fallback)
drop policy if exists "user_settings: select own" on public.user_settings;
create policy "user_settings: select own" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "user_settings: insert own" on public.user_settings;
create policy "user_settings: insert own" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "user_settings: update own" on public.user_settings;
create policy "user_settings: update own" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- push_subscriptions
drop policy if exists "push_subscriptions: select own" on public.push_subscriptions;
create policy "push_subscriptions: select own" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "push_subscriptions: insert own" on public.push_subscriptions;
create policy "push_subscriptions: insert own" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "push_subscriptions: update own" on public.push_subscriptions;
create policy "push_subscriptions: update own" on public.push_subscriptions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "push_subscriptions: delete own" on public.push_subscriptions;
create policy "push_subscriptions: delete own" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- notification_log: no policies for `authenticated`/`anon` => no client access.
-- The Edge Function uses the service role key, which bypasses RLS.

-- Explicitly deny anonymous access at the privilege level as well.
revoke all on public.cycles, public.daily_logs, public.user_settings,
              public.push_subscriptions, public.notification_log from anon;
revoke all on public.notification_log from authenticated;

-- ---------------------------------------------------------------------------
-- register_push_subscription: upsert by endpoint. If the same browser was
-- previously subscribed under a different account (shared phone, re-login),
-- the row is reassigned to the caller. A plain client-side upsert can't do
-- this because RLS hides the other user's row.
-- ---------------------------------------------------------------------------
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_keys jsonb,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, keys, user_agent)
  values (auth.uid(), p_endpoint, p_keys, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        keys = excluded.keys,
        user_agent = excluded.user_agent,
        created_at = now();
end;
$$;

revoke execute on function public.register_push_subscription(text, jsonb, text) from public, anon;
grant execute on function public.register_push_subscription(text, jsonb, text) to authenticated;
