// Generates a VAPID key pair for Web Push plus a random CRON_SECRET and prints
// where each value goes. Run once per environment: `npm run vapid`.
import webpush from 'web-push';
import { randomBytes } from 'node:crypto';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const cronSecret = randomBytes(32).toString('base64url');

console.log(`
# 1) Frontend — .env.local and Vercel environment variables
VITE_VAPID_PUBLIC_KEY=${publicKey}

# 2) Supabase Edge Function secrets (keep the private key secret!)
npx supabase secrets set \\
  VAPID_PUBLIC_KEY=${publicKey} \\
  VAPID_PRIVATE_KEY=${privateKey} \\
  VAPID_SUBJECT=mailto:you@example.com \\
  CRON_SECRET=${cronSecret}

# 3) Supabase Vault (SQL editor) so pg_cron can call the function
select vault.create_secret('${cronSecret}', 'cron_secret');
select vault.create_secret('https://qrgbfxrzypqtckfdfkil.supabase.co', 'project_url');

# Changing VAPID keys later invalidates every existing push subscription.
`);
