-- Indian metric units: store water intake in millilitres instead of glasses,
-- and default new accounts to India Standard Time.
-- Safe to run whether or not the initial migration already has data.

alter table public.daily_logs drop constraint if exists daily_logs_water_intake_check;

-- Existing values were glasses (0–30, ~250 ml each). Convert them to ml.
alter table public.daily_logs
  alter column water_intake type integer using (water_intake::integer * 250);

alter table public.daily_logs
  add constraint daily_logs_water_intake_check check (water_intake between 0 and 10000);

comment on column public.daily_logs.water_intake is 'Water drunk that day, in millilitres (ml).';

alter table public.user_settings alter column timezone set default 'Asia/Kolkata';
