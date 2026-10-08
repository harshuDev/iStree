# iStree — working notes

## Branches & deploys
- `main` is the production branch and the GitHub default. Vercel deploys it to https://i-stree.vercel.app.
- Day-to-day work happens on a feature branch (currently `ccr-e017b8b7-2wypkw`). Pushes there get a Vercel preview URL.
- Pull requests always target **`main`** as the base. Never push or commit directly to `main`; changes reach it only by the owner merging a PR.
- Pushes that touch `supabase/functions/**` on `main` or the feature branch redeploy the Edge Functions via `.github/workflows/supabase-functions.yml`.

## Database
- Schema lives in `supabase/migrations/`. Every migration must stay safe to re-run.
- After changing a migration, regenerate the SQL Editor bundle with `npm run setup-sql` (writes `supabase/setup.sql`).

## Conventions
- All Supabase calls go through `src/services/`; React Query hooks are in `src/hooks/queries.ts`.
- UI: Lunari-inspired design system in `src/styles/global.css` (tokens for light + dark; brand pink `#FF689B`, Urbanist font bundled via `@fontsource-variable/urbanist`). Theme preference (System/Light/Dark) lives in `src/lib/theme.ts` as `<html data-theme>`.
- Units: millilitres/litres, `en-IN` formatting, Sunday-first calendar, default timezone `Asia/Kolkata`.
- Cycle math and notification copy are shared with the Edge Function: `supabase/functions/_shared/`.
- Before pushing: `npx tsc -b`, `npm test`, `npm run build`.
