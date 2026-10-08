import { useState, type FormEvent } from 'react';
import { sendPasswordReset, signInWithPassword, signUp } from '../services/auth';
import { isSupabaseConfigured } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'reset';

// One illustration per tab. Both are rendered (stacked) so switching tabs
// crossfades instantly instead of waiting for a download.
const HERO = {
  signin: {
    src: '/auth/sign-in.webp',
    alt: 'Illustrated planner page tracking mood, hydration, sleep and meals around a daily wheel',
    title: 'Welcome back',
  },
  signup: {
    src: '/auth/create-account.webp',
    alt: 'Illustrated hand holding a menstrual cup with flowers growing from it',
    title: 'Your cycle, your rhythm',
  },
} as const;

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
  const heroMode = mode === 'signup' ? 'signup' : 'signin';
  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  return (
    <main className="app app--bare">
      <div className="page">
        <div className="auth-hero">
          {(Object.keys(HERO) as (keyof typeof HERO)[]).map((key) => (
            <img
              key={key}
              src={HERO[key].src}
              alt={key === heroMode ? HERO[key].alt : ''}
              aria-hidden={key !== heroMode}
              className={`auth-hero__img auth-hero__img--${key}${key === heroMode ? ' is-active' : ''}`}
              decoding="async"
            />
          ))}
        </div>

        <div className="row" style={{ gap: 12 }}>
          <img src="/pwa-192x192.png" alt="" width={44} height={44} style={{ borderRadius: 12 }} />
          <div className="stack" style={{ gap: 2 }}>
            <h1 style={{ fontSize: '1.35rem' }}>{mode === 'reset' ? 'iStree' : HERO[heroMode].title}</h1>
            <p className="muted small">Gentle cycle tracking with reminders that follow your rhythm.</p>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="alert alert--error">Supabase isn't configured. Add your keys to .env.local (see README).</div>
        )}

        {mode !== 'reset' && (
          <div className="segmented" role="group" aria-label="Sign-in method">
            {(['signin', 'signup'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
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
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
          {mode === 'signin' && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => switchMode('reset')}>
              Forgot password?
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => switchMode('signin')}>
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
