import { useState, type FormEvent } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '../components/Icons';
import { isSupabaseConfigured } from '../lib/supabase';
import { sendPasswordReset, signInWithPassword, signUp } from '../services/auth';

type Mode = 'signin' | 'signup' | 'reset';

// One illustration per tab. Both are rendered (stacked) so switching tabs
// crossfades instantly instead of waiting for a download.
const HERO = {
  signin: {
    src: '/auth/sign-in.webp',
    alt: 'Illustrated planner page tracking mood, hydration, sleep and meals around a daily wheel',
    title: 'Welcome Back! 👋',
    subtitle: 'Access your iStree account and stay on top of your cycle.',
  },
  signup: {
    src: '/auth/create-account.webp',
    alt: 'Illustrated hand holding a menstrual cup with flowers growing from it',
    title: 'Join iStree Today ✨',
    subtitle: 'Sign up to start tracking your cycle today.',
  },
} as const;

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const heroMode = mode === 'signup' ? 'signup' : 'signin';
  const needsPassword = mode !== 'reset';

  return (
    <main className="app app--bare">
      <div className="page" style={{ paddingTop: 8 }}>
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

        <div className="stack" style={{ gap: 6 }}>
          <h1>{mode === 'reset' ? 'Forgot Password? 🔑' : HERO[heroMode].title}</h1>
          <p className="muted small">
            {mode === 'reset' ? "Don't worry — enter your registered email and we'll send you a reset link." : HERO[heroMode].subtitle}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="alert alert--error">Supabase isn't configured. Add your keys to .env.local (see README).</div>
        )}

        {mode !== 'reset' && (
          <div className="segmented segmented--plain" role="group" aria-label="Account">
            {(['signin', 'signup'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        )}

        <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">{mode === 'reset' ? 'Registered email address' : 'Email'}</label>
            <div className="input-wrap">
              <MailIcon />
              <input id="email" className="input" type="email" placeholder="Email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          {needsPassword && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <LockIcon />
                <input
                  id="password"
                  className="input input--trailing"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="icon-btn" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          )}
          {mode === 'signin' && (
            <button type="button" className="link-btn" style={{ alignSelf: 'flex-end' }} onClick={() => switchMode('reset')}>
              Forgot password?
            </button>
          )}
          {error && <div className="alert alert--error">{error}</div>}
          {notice && <div className="alert alert--success">{notice}</div>}
          <button className="btn btn--block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </button>
          {mode === 'reset' ? (
            <button type="button" className="link-btn" onClick={() => switchMode('signin')}>Back to sign in</button>
          ) : (
            <p className="center small muted">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" className="link-btn" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </form>

        <p className="tiny faint center">Your health data is private to your account and never shared with analytics or advertisers.</p>
      </div>
    </main>
  );
}
