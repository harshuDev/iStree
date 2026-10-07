import { useEffect, useState } from 'react';
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push';
import { detectPlatform, iosVersion } from '../lib/pwa';
import { sendTestPush } from '../services/pushSubscriptions';
import { useUpdateSettings } from '../hooks/queries';
import { Link } from 'react-router-dom';

const COPY: Record<PushState, string> = {
  unsupported: "This browser doesn't support push notifications.",
  'needs-install': 'Add iStree to your home screen first — then you can turn on reminders.',
  denied: 'Notifications are blocked. Enable them for iStree in your device settings, then come back.',
  prompt: 'Get gentle reminders for water, rest, sleep and phase changes.',
  off: 'Notifications are allowed but this device is not subscribed yet.',
  on: 'Reminders are on for this device.',
};

export function NotificationsCard({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const { mutateAsync: updateSettings } = useUpdateSettings();

  useEffect(() => {
    void getPushState().then(setState);
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
      setState(await getPushState());
    }
  };

  const turnOn = () =>
    run(async () => {
      const next = await enablePush();
      if (next === 'on') await updateSettings({ notifications_enabled: true });
    });
  const turnOff = () => run(disablePush);
  const test = () =>
    run(async () => {
      await sendTestPush();
      setMessage({ type: 'success', text: 'Test sent — it should arrive in a few seconds.' });
    });

  if (!state) return null;
  const oldIOS = detectPlatform() === 'ios' && (iosVersion() ?? 99) < 16.4;

  return (
    <div className="card">
      {!compact && <h2>Reminders on this device</h2>}
      <p className="muted small">{oldIOS ? 'Push notifications need iOS 16.4 or newer. Update iOS to receive reminders.' : COPY[state]}</p>
      {state === 'needs-install' && (
        <Link to="/install" className="btn btn--secondary">How to install</Link>
      )}
      {(state === 'prompt' || state === 'off') && !oldIOS && (
        <button className="btn btn--block" onClick={turnOn} disabled={busy}>
          {busy ? 'Turning on…' : 'Turn on reminders'}
        </button>
      )}
      {state === 'on' && (
        <div className="row">
          <button className="btn btn--secondary btn--small" onClick={test} disabled={busy}>Send test</button>
          <button className="btn btn--ghost btn--small" onClick={turnOff} disabled={busy}>Turn off on this device</button>
        </div>
      )}
      {message && <div className={`alert alert--${message.type}`}>{message.text}</div>}
    </div>
  );
}
