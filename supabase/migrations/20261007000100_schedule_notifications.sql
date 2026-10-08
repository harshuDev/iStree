-- Schedules the `send-notifications` Edge Function every 15 minutes using
-- pg_cron + pg_net. The function decides, per user and in their own timezone,
-- which reminders are due in the current 15-minute window.
--
-- BEFORE this job can succeed, store two secrets in Supabase Vault
-- (Dashboard → Project Settings → Vault, or run in the SQL editor):
--
--   select vault.create_secret('https://qrgbfxrzypqtckfdfkil.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'cron_secret');
--
-- The migration itself succeeds without them; the job just fails until they exist.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Re-runnable: drop an existing job with the same name first.
select cron.unschedule(jobid) from cron.job where jobname = 'istree-send-notifications';

select cron.schedule(
  'istree-send-notifications',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body    := jsonb_build_object('triggered_at', now()),
    timeout_milliseconds := 25000
  );
  $$
);

-- Keep the dedupe log small: purge entries older than 7 days, daily at 03:17 UTC.
select cron.unschedule(jobid) from cron.job where jobname = 'istree-prune-notification-log';

select cron.schedule(
  'istree-prune-notification-log',
  '17 3 * * *',
  $$ delete from public.notification_log where sent_at < now() - interval '7 days'; $$
);
