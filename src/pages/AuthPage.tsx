import { useState, type FormEvent } from 'react';
import { sendMagicLink, sendPasswordReset, signInWithPassword, signUp } from '../services/auth';
import { isSupabaseConfigured } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'magic' | 'reset';

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') await signInWithPassword(email, password);
      if (mode === 'signup' && (await signUp(email, password))) setNotice('Check your inbox to confirm your email, then sign in.');
      if (mode === 'magic') {
        await sendMagicLink(email);
        setNotice('We sent you a sign-in link. Open it on this device.');
      }
      if (mode === 'reset') {
        await sendPasswordReset(email);
        setNotice('If an account exists, a reset link is on its way.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const needsPassword = mode === 'signin' || mode === 'signup';

  return (
    <main className="app app--bare">
      <div className="page" style={{ paddingTop: '8vh' }}>
        <div className="center stack" style={{ alignItems: 'center' }}>
          <img src="/pwa-192x192.png" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
          <h1>iStree</h1>
          <p className="muted">Gentle cycle tracking with reminders that follow your rhythm.</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="alert alert--error">Supabase isn't configured. Add your keys to .env.local (see README).</div>
        )}

        {mode !== 'reset' && (
          <div className="segmented" role="group" aria-label="Sign-in method">
            {(['signin', 'signup', 'magic'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'signin' ? 'Sign in' : m === 'signup' ? 'Create account' : 'Email link'}
              </button>
            ))}
          </div>
        )}

        <form className="card" onSubmit={submit}>
          {mode === 'reset' && <h2>Reset your password</h2>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {needsPassword && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {error && <div className="alert alert--error">{error}</div>}
          {notice && <div className="alert alert--success">{notice}</div>}
          <button className="btn btn--block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Send me a link' : 'Send reset link'}
          </button>
          {mode === 'signin' && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setMode('reset')}>
              Forgot password?
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setMode('signin')}>
              Back to sign in
            </button>
          )}
        </form>

        <p className="small muted center">
          Your health data is private to your account and never shared with analytics or advertisers.
        </p>
      </div>
    </main>
  );
}
