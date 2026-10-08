// Concatenates supabase/migrations/*.sql (in order) plus the Vault secrets
// into supabase/setup.sql, for pasting into the Supabase SQL Editor.
// Run after changing any migration: `npm run setup-sql`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_URL = 'https://qrgbfxrzypqtckfdfkil.supabase.co';
const dir = 'supabase/migrations';
const rule = '-- ' + '='.repeat(77);

const header = `${rule}
-- iStree: one-shot database setup for the Supabase SQL Editor
-- Project: ${PROJECT_URL}
--
-- HOW TO USE
--   1. Dashboard → Database → Extensions: make sure "pg_cron" and "pg_net" are
--      enabled (the schedule part below also tries to enable them).
--   2. Dashboard → SQL Editor → New query → paste this whole file → Run.
--   3. Safe to run more than once: anything that already exists is skipped
--      or replaced, and existing data is kept. It is the files in
--      supabase/migrations/ concatenated in order, plus the Vault secrets.
--   4. Copy the cron secret shown in the results into your Edge Function
--      secrets as CRON_SECRET.
--
-- Generated from supabase/migrations/. Do not edit by hand — edit the
-- migrations and regenerate with: npm run setup-sql
${rule}
`;

const parts = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => `\n${rule}\n-- PART: ${f}\n${rule}\n${readFileSync(join(dir, f), 'utf8').trimEnd()}\n`);

const vault = `
${rule}
-- PART: Vault secrets used by the pg_cron job to call the Edge Function
${rule}
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret('${PROJECT_URL}', 'project_url');
  end if;
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    -- 64 random hex characters, generated inside your database.
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'cron_secret'
    );
  end if;
end;
$$;

-- Copy this value and set it as the Edge Function secret CRON_SECRET:
--   Dashboard → Edge Functions → Secrets  (or: npx supabase secrets set CRON_SECRET=...)
select decrypted_secret as cron_secret_copy_this
from vault.decrypted_secrets
where name = 'cron_secret';
`;

writeFileSync('supabase/setup.sql', header + parts.join('') + vault);
console.log('Wrote supabase/setup.sql');
