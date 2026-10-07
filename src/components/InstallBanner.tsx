import { useState } from 'react';
import { Link } from 'react-router-dom';
import { detectPlatform, isStandalone } from '../lib/pwa';

const DISMISS_KEY = 'istree-install-banner-dismissed';

/** Gentle reminder on phones running in a browser tab rather than installed. */
export function InstallBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (dismissed || isStandalone() || detectPlatform() === 'desktop') return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="card card--soft" style={{ marginBottom: 16 }}>
      <div className="row row--between">
        <strong>Add iStree to your home screen</strong>
        <button className="btn btn--ghost btn--small" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
      <p className="small muted">
        {detectPlatform() === 'ios'
          ? 'On iPhone, reminders only work once iStree is on your home screen.'
          : 'Install for a full-screen app and reliable reminders.'}
      </p>
      <Link to="/install" className="btn btn--small">
        Show me how
      </Link>
    </div>
  );
}
