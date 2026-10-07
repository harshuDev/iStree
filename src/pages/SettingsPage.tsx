import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { NotificationsCard } from '../components/NotificationsCard';
import { ErrorNote, Spinner, Stepper, Switch } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useCycleState, useUpdateSettings } from '../hooks/queries';
import { computeAverages } from '../lib/cycle';
import type { UserSettings, UserSettingsUpdate } from '../lib/database.types';
import { toTimeInput } from '../lib/dates';
import { disablePush } from '../lib/push';
import { isStandalone } from '../lib/pwa';
import { deleteMyAccount, exportMyData } from '../services/account';
import { signOut, updatePassword } from '../services/auth';

function TimeField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <input type="time" className="input" style={{ width: 148, padding: '0 10px', flexShrink: 0 }} value={toTimeInput(value)} disabled={disabled} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </label>
  );
}

export function SettingsPage() {
  const { user, passwordRecovery, clearPasswordRecovery } = useAuth();
  const { settings, cycles, loading } = useCycleState();
  const update = useUpdateSettings();
  const [newPassword, setNewPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [accountErr, setAccountErr] = useState<unknown>(null);

  if (loading || !settings) return <div className="splash"><Spinner /></div>;
  const s: UserSettings = settings;
  const patch = (p: UserSettingsUpdate) => update.mutate(p);
  const computed = computeAverages(cycles);
  const notifOff = !s.notifications_enabled;

  const setHydration = (i: number, v: string) => patch({ hydration_times: s.hydration_times.map((t, j) => (j === i ? v : t)) });

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setAccountErr(null);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      clearPasswordRecovery();
      setAccountMsg('Password updated.');
    } catch (err) {
      setAccountErr(err);
    }
  };

  const download = async () => {
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `istree-export-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAccountErr(err);
    }
  };

  const logout = async () => {
    await disablePush().catch(() => undefined); // stop this device getting the old account's reminders
    await signOut();
  };

  const remove = async () => {
    if (!confirm('Delete your account and all your data permanently? This cannot be undone.')) return;
    try {
      await disablePush().catch(() => undefined);
      await deleteMyAccount();
    } catch (err) {
      setAccountErr(err);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Settings</h1>
      </header>

      {passwordRecovery && (
        <form className="card card--soft" onSubmit={changePassword}>
          <h2>Choose a new password</h2>
          <input className="input" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button className="btn">Save password</button>
        </form>
      )}

      <NotificationsCard />

      <section className="card">
        <h2>Reminders</h2>
        <Switch label="Send me reminders" description="Applies to all your installed devices" checked={s.notifications_enabled} onChange={(v) => patch({ notifications_enabled: v })} />
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 0 }} />
        <Switch label="Phase changes" description="A morning note when you enter a new phase" checked={s.notify_phase_changes} disabled={notifOff} onChange={(v) => patch({ notify_phase_changes: v })} />
        <Switch label="Period heads-up" description="2 days before and on the predicted day" checked={s.notify_period_forecast} disabled={notifOff} onChange={(v) => patch({ notify_period_forecast: v })} />
        <TimeField label="Morning reminders at" value={s.morning_time} disabled={notifOff} onChange={(v) => patch({ morning_time: v })} />
        <Switch label="Daily check-in" description="Skipped if you've already checked in" checked={s.notify_daily_checkin} disabled={notifOff} onChange={(v) => patch({ notify_daily_checkin: v })} />
        {s.notify_daily_checkin && <TimeField label="Check-in at" value={s.checkin_time} disabled={notifOff} onChange={(v) => patch({ checkin_time: v })} />}
        <Switch label="Hydration" checked={s.notify_hydration} disabled={notifOff} onChange={(v) => patch({ notify_hydration: v })} />
        {s.notify_hydration && (
          <div className="stack" style={{ gap: 4 }}>
            {s.hydration_times.map((t, i) => (
              <div key={i} className="row row--between">
                <div style={{ flex: 1 }}>
                  <TimeField label={`Water #${i + 1}`} value={t} disabled={notifOff} onChange={(v) => setHydration(i, v)} />
                </div>
                <button type="button" className="btn btn--ghost btn--small" aria-label={`Remove water reminder ${i + 1}`} onClick={() => patch({ hydration_times: s.hydration_times.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            {s.hydration_times.length < 8 && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => patch({ hydration_times: [...s.hydration_times, '12:00'] })}>+ Add water reminder</button>
            )}
          </div>
        )}
        <Switch label="Wind-down for sleep" checked={s.notify_sleep} disabled={notifOff} onChange={(v) => patch({ notify_sleep: v })} />
        {s.notify_sleep && <TimeField label="Wind down at" value={s.sleep_time} disabled={notifOff} onChange={(v) => patch({ sleep_time: v })} />}
        <Switch
          label="Quiet hours"
          description="No reminders during this time"
          checked={!!s.quiet_hours_start}
          disabled={notifOff}
          onChange={(v) => patch(v ? { quiet_hours_start: '22:30', quiet_hours_end: '07:30' } : { quiet_hours_start: null, quiet_hours_end: null })}
        />
        {s.quiet_hours_start && s.quiet_hours_end && (
          <>
            <TimeField label="From" value={s.quiet_hours_start} disabled={notifOff} onChange={(v) => patch({ quiet_hours_start: v })} />
            <TimeField label="Until" value={s.quiet_hours_end} disabled={notifOff} onChange={(v) => patch({ quiet_hours_end: v })} />
          </>
        )}
        <p className="small muted">Times are in your timezone: {s.timezone}</p>
      </section>

      <section className="card">
        <h2>Cycle</h2>
        <Switch
          label="Learn from my history"
          description={
            computed.cycleLength
              ? `From your logs: ${computed.cycleLength}-day cycle, ${computed.periodLength ?? s.average_period_length}-day period`
              : 'Used once you have logged two full cycles'
          }
          checked={s.use_computed_averages}
          onChange={(v) => patch({ use_computed_averages: v })}
        />
        <div className="row row--between">
          <span>{s.use_computed_averages ? 'Fallback cycle length' : 'Cycle length'}</span>
          <Stepper label="cycle length" value={s.average_cycle_length} min={15} max={60} format={(v) => `${v} d`} onChange={(v) => patch({ average_cycle_length: v })} />
        </div>
        <div className="row row--between">
          <span>{s.use_computed_averages ? 'Fallback period length' : 'Period length'}</span>
          <Stepper label="period length" value={s.average_period_length} min={1} max={15} format={(v) => `${v} d`} onChange={(v) => patch({ average_period_length: v })} />
        </div>
      </section>

      <section className="card">
        <h2>Profile</h2>
        <div className="field">
          <label htmlFor="display-name">What should we call you?</label>
          <input
            id="display-name"
            className="input"
            maxLength={60}
            defaultValue={s.display_name ?? ''}
            onBlur={(e) => e.target.value !== (s.display_name ?? '') && patch({ display_name: e.target.value.trim() || null })}
          />
        </div>
      </section>

      <ErrorNote error={update.error} />

      <section className="card">
        <h2>Account</h2>
        <p className="small muted">Signed in as {user?.email}</p>
        {!passwordRecovery && (
          <form className="row" onSubmit={changePassword}>
            <input className="input" type="password" placeholder="New password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button className="btn btn--secondary btn--small">Change</button>
          </form>
        )}
        {accountMsg && <div className="alert alert--success">{accountMsg}</div>}
        <ErrorNote error={accountErr} />
        {!isStandalone() && <Link to="/install" className="btn btn--secondary">Install iStree</Link>}
        <button className="btn btn--secondary" onClick={download}>Export my data (JSON)</button>
        <button className="btn btn--secondary" onClick={logout}>Sign out</button>
        <button className="btn btn--danger" onClick={remove}>Delete account</button>
      </section>

      <p className="small muted center">
        iStree stores your data in your private account only. No analytics or ad SDKs ever see your health data.
        Predictions are estimates, not medical advice.
      </p>
    </div>
  );
}
