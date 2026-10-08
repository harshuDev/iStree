# iStree 🌸

A calm, private cycle tracker that sends **phase-aware reminders** to eat, drink water, sleep and rest according to where you are in your cycle. Built as an installable **PWA** (Android + iOS 16.4+) with **Web Push**.

**Stack:** React 19 + Vite + TypeScript · Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron) · React Query · vite-plugin-pwa (Workbox) · Vercel

---

## Features

| Screen | What it does |
|---|---|
| **Today** | Current phase on a cycle ring, days until your next period, food / movement / rest tips for the phase, one-tap "period started / ended" |
| **Cycle** | Month calendar with logged periods, predicted periods (dashed), fertile window and estimated ovulation; tap a day to log or remove; history table |
| **Check-in** | Flow, mood, symptoms, water (ml / litres, with +250 ml / +500 ml / +1 L quick-add), sleep (hours), energy, rest, notes, for today or any past day. "Nudge me later" local reminders |
| **Insights** | Average cycle and period length, cycle-length chart (with table view), most common symptoms and the phase they cluster in, moods, sleep / water / energy by phase |
| **Settings** | Push on/off per device, test push, which reminders and at what times, quiet hours, learned vs. manual cycle length, display name, password, JSON export, sign out, delete account |
| **Install / onboarding** | Detects browser vs. installed app. Android/desktop gets a native install button; iOS gets step-by-step **Share → Add to Home Screen** instructions. Notification permission is only asked for once installed |

Predictions use the calendar method (ovulation ≈ 14 days before the next period, fertile window = 5 days before through 1 day after). Once two full cycles are logged, averages are learned from your history. **They're estimates for wellbeing, not contraception or diagnosis**, and the UI says so.

---

## Project structure

```
├── index.html                    # iOS meta tags, apple-touch-icon
├── vite.config.ts                # PWA manifest + injectManifest service worker
├── pwa-assets.config.ts          # icon generation from public/logo.svg
├── vercel.json                   # SPA rewrites, SW/manifest caching, security headers + CSP
├── .env.example
├── public/                       # generated icons (64/192/512, maskable, apple-touch 180, favicon)
├── scripts/generate-vapid-keys.mjs
├── src/
│   ├── sw.ts                     # service worker: precache, offline nav, push + notificationclick
│   ├── main.tsx / App.tsx        # providers, routes, auth + onboarding guards
│   ├── lib/
│   │   ├── supabase.ts           # typed client
│   │   ├── database.types.ts     # DB types (regenerate after schema changes)
│   │   ├── cycle.ts              # re-exports shared cycle math + messages
│   │   ├── insights.ts           # aggregation for the Insights screen
│   │   ├── pwa.ts                # platform/standalone detection, install prompt, SW registration
│   │   ├── push.ts               # permission + PushManager subscription
│   │   ├── localReminders.ts     # same-session reminders
│   │   └── queryClient.ts        # React Query + offline persistence
│   ├── services/                 # ← ALL Supabase calls live here
│   ├── hooks/                    # useAuth, React Query hooks
│   ├── components/               # Calendar, PhaseRing, charts, InstallGuide, NotificationsCard, UI kit
│   ├── pages/                    # Auth, Onboarding, Today, Cycle, CheckIn, Insights, Settings, Install
│   └── styles/global.css         # design tokens, light + dark
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 20261007000000_init_schema.sql          # tables, RLS, triggers, RPC
    │   ├── 20261007000100_schedule_notifications.sql # pg_cron → Edge Function every 15 min
    │   └── 20261008000000_water_in_millilitres.sql   # water in ml, IST default timezone
    └── functions/
        ├── _shared/cycle.ts      # phase + prediction math (used by app AND Edge Function)
        ├── _shared/messages.ts   # phase-aware notification copy and tips
        ├── send-notifications/   # scheduled push sender (+ test push)
        └── delete-account/
```

### Data model

| Table | Notes |
|---|---|
| `auth.users` | Managed by Supabase Auth |
| `cycles` | `start_date`, `end_date`, `cycle_length`. A trigger keeps `cycle_length` (days to the next start) up to date. Unique per user + start date |
| `daily_logs` | One row per user per day: `flow_intensity` (enum), `mood`, `symptoms[]`, `water_intake` (**millilitres**), `sleep_hours`, `energy_level`, `rested`, `notes` |
| `user_settings` | Averages + override flag, `timezone` (defaults to `Asia/Kolkata`, then synced from the device), all reminder toggles and times, quiet hours. Created automatically on sign-up |
| `push_subscriptions` | `endpoint` (unique), `keys` {p256dh, auth}, `user_agent`. Written through the `register_push_subscription` RPC so a shared device can move between accounts |
| `notification_log` | Server-only dedupe table so each reminder goes out at most once per local day |

**RLS:** every table has RLS enabled. Users can `select/insert/update/delete` only rows where `user_id = auth.uid()`. `notification_log` has no client policies at all, so only the service role (the Edge Function) can touch it. `anon` has no privileges.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local      # fill in the values (below)
npm run dev                     # http://localhost:5173
npm test                        # cycle-math unit tests
npm run build                   # typecheck + production build
```

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` + Vercel | `https://qrgbfxrzypqtckfdfkil.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Public anon key (safe in the browser; RLS protects data) |
| `VITE_VAPID_PUBLIC_KEY` | `.env.local` + Vercel | Web Push public key used by the browser to subscribe |
| `VAPID_PUBLIC_KEY` | Supabase secret | Same public key, for the Edge Function |
| `VAPID_PRIVATE_KEY` | **Supabase secret only** | Signs push messages. Never put it in Vercel or anything `VITE_`-prefixed, because Vite bundles those into public JS |
| `VAPID_SUBJECT` | Supabase secret | `mailto:you@yourdomain` contact for push services |
| `CRON_SECRET` | Supabase secret + Vault | Shared secret pg_cron sends to the Edge Function |

The private VAPID key lives in Supabase, not Vercel, because **sending** happens in the Edge Function. The Vercel frontend only ever needs the public key.

Generate keys and a cron secret (prints exactly where each one goes):

```bash
npm run vapid
```

---

## 2. Supabase: apply the schema

### Option A: Supabase CLI (recommended)

```bash
npx supabase login
npx supabase link --project-ref qrgbfxrzypqtckfdfkil
npx supabase db push                 # applies supabase/migrations/*.sql in order
```

Local stack (Docker): `npx supabase start`, then `npx supabase db reset` replays all migrations locally. Point `.env.local` at `http://localhost:54321` with the local anon key that `supabase start` prints.

### Option B: Dashboard

1. **Database → Extensions:** enable **pg_cron** and **pg_net**.
2. **SQL Editor → New query:** paste all of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**. It contains every migration in order, plus the Vault secrets for the reminder schedule. It is safe to run again: existing tables, data and secrets are kept.
3. The last result row, `cron_secret_copy_this`, is a secret generated in your database. Set it as the Edge Function secret `CRON_SECRET`.

`setup.sql` is generated from the migrations by `npm run setup-sql`. If you later switch to the CLI, first mark these migrations as already applied: `npx supabase migration repair --status applied 20261007000000 20261007000100 20261008000000`.

### Regenerate types after schema changes

```bash
npx supabase gen types typescript --project-id qrgbfxrzypqtckfdfkil > src/lib/database.types.ts
```

### Auth settings

In **Authentication → URL Configuration**:

- **Site URL:** your production URL, e.g. `https://istree.vercel.app`
- **Redirect URLs:** add `https://istree.vercel.app/**`, `https://*-<your-team>.vercel.app/**` (previews) and `http://localhost:5173/**`

Email/password and magic links work out of the box. For production volumes, configure custom SMTP under **Authentication → Emails**.

---

## 3. Push notifications

### Deploy the Edge Functions and secrets

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=...

npx supabase functions deploy send-notifications --no-verify-jwt
npx supabase functions deploy delete-account
```

`send-notifications` verifies its callers itself: pg_cron sends the `x-cron-secret` header, and signed-in users send their own JWT for a test push. That's why it is deployed with `--no-verify-jwt`.

### Turn on the schedule

Store two Vault secrets (SQL editor) so the cron job can reach the function:

```sql
select vault.create_secret('https://qrgbfxrzypqtckfdfkil.supabase.co', 'project_url');
select vault.create_secret('<same CRON_SECRET as above>', 'cron_secret');
```

The `20261007000100_schedule_notifications.sql` migration schedules the job every 15 minutes. Check it with:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 10;
select * from net._http_response order by created desc limit 10;
```

### How it works

1. **Install first.** On iOS, `Notification.requestPermission()` only exists for home-screen web apps (iOS 16.4+), so the app asks only when `display-mode: standalone`. On Android we also wait until installed. Desktop is allowed so it's easy to test.
2. The browser subscribes with `VITE_VAPID_PUBLIC_KEY`, and the subscription is saved through the `register_push_subscription` RPC.
3. Every 15 minutes pg_cron calls `send-notifications`. For each user with reminders on, the function:
   - works out the local time in `user_settings.timezone` (synced from the device automatically),
   - computes today's phase using the **same `_shared/cycle.ts` the app uses**,
   - collects what's due in this 15-minute window: phase-change note and period heads-up (morning), daily check-in (skipped if already logged), hydration times, sleep wind-down, while respecting quiet hours,
   - claims each reminder in `notification_log` (at most once per day), then sends phase-specific copy from `_shared/messages.ts`,
   - removes subscriptions that return 404/410 (expired or revoked).
4. The service worker (`src/sw.ts`) shows the notification and opens the relevant screen when it's tapped. On iOS every push **must** show a notification, or Safari revokes permission. The SW always shows one.

**Local notifications:** "Nudge me later" on the Check-in screen uses `setTimeout` + `registration.showNotification` with no server involved. They only fire while the app is still alive in memory. Anything that must survive closing the app goes through server push.

---

## 4. Deploy to Vercel

1. Import the GitHub repo in Vercel. The framework (Vite) is detected, and `vercel.json` sets build, rewrites and headers.
2. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_VAPID_PUBLIC_KEY` for **Production** and **Preview**.
3. Deploy, then add the URL to Supabase Auth redirect URLs.

`vercel.json` also:

- serves `/sw.js`, `/manifest.webmanifest` and `index.html` with `max-age=0, must-revalidate` so updates roll out immediately, and hashed `/assets/*` as immutable,
- rewrites all extensionless paths to `index.html` (SPA deep links),
- sets security headers and a **CSP that only allows connections to `*.supabase.co`**. This enforces the "no third-party analytics on health data" rule at the browser level. If you use a custom Supabase domain, add it to `connect-src`.

---

## 5. Testing the installed PWA

Service workers, install prompts and push all require **HTTPS** (`localhost` is the only exception, and phones can't reach your laptop's localhost).

**Easiest: Vercel preview URLs.** Every pushed branch gets an HTTPS preview URL. Open it on your phone:

- **iPhone (iOS 16.4+):** open in Safari → Share → Add to Home Screen → open iStree **from the home screen** → Settings → Turn on reminders → Send test.
- **Android (Chrome):** open the URL → Install (in-app button or ⋮ → Install app) → open from the home screen → turn on reminders.

**Local dev on a phone via a tunnel:**

```bash
npm run build && npx vite preview --port 4173   # production SW behaviour
# in another terminal, either:
ngrok http 4173
# or
npx cloudflared tunnel --url http://localhost:4173
```

Open the HTTPS tunnel URL on the phone and add it to Supabase Auth redirect URLs while testing. `npm run dev` also registers the service worker (`devOptions.enabled`), but `vite preview` matches production most closely.

**Desktop debugging:** Chrome DevTools → Application → Manifest / Service Workers / Push (you can send a test push payload there). For iOS, use Safari on a Mac → Develop → [your iPhone] → iStree to inspect the home-screen app.

**Edge Function locally:**

```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill in
npx supabase functions serve --env-file supabase/functions/.env
curl -X POST http://localhost:54321/functions/v1/send-notifications -H "x-cron-secret: <CRON_SECRET>"
```

---

## Units & locale

The app follows Indian conventions: liquids are in **millilitres / litres** (stored as ml in `daily_logs.water_intake`, shown as "750 ml" or "1.5 L"), sleep is in hours, dates use the `en-IN` format ("8 Oct"), calendars start on **Sunday**, and the default timezone is **Asia/Kolkata (IST)**. Unit helpers live in `src/lib/units.ts`.

## Privacy notes

- No analytics or third-party SDKs. The CSP blocks connections to anything except your Supabase project.
- Supabase API responses are cached by React Query in local storage so the installed app opens offline. The cache is **cleared on sign-out**, and the service worker deliberately does **not** cache API responses.
- Signing out also unsubscribes the device from push, so a shared phone doesn't get the previous user's reminders.
- Users can export all their data as JSON and permanently delete their account (all rows cascade).

## Regenerating icons

Edit `public/logo.svg`, then run `npm run icons`.
