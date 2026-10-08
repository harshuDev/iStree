import { useEffect, useState, type FormEvent } from 'react';
import { NotificationsCard } from '../components/NotificationsCard';
import {
  BellIcon,
  DownloadIcon,
  DropIcon,
  EditIcon,
  KeyIcon,
  LogoutIcon,
  MoonIcon,
  PhoneIcon,
  ShieldIcon,
  SlidersIcon,
  SunMoonIcon,
  TrashIcon,
} from '../components/Icons';
import { ErrorNote, ListRow, Sheet, Spinner, Stepper, TopBar } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useCycleState, useUpdateSettings } from '../hooks/queries';
import { computeAverages } from '../lib/cycle';
import type { UserSettings, UserSettingsUpdate } from '../lib/database.types';
import { toTimeInput } from '../lib/dates';
import { disablePush } from '../lib/push';
import { isStandalone } from '../lib/pwa';
import { setThemePreference, useThemePreference, type ThemePreference } from '../lib/theme';
import { deleteMyAccount, exportMyData } from '../services/account';
import { signOut, updatePassword } from '../services/auth';

const THEME_LABEL: Record<ThemePreference, string> = { system: 'System default', light: 'Light', dark: 'Dark' };

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </span>
  );
}

function TimeInput({ value, onChange, disabled, label }: { value: string; onChange: (v: string) => void; disabled?: boolean; label: string }) {
  return (
    <input type="time" className="input" aria-label={label} value={toTimeInput(value)} disabled={disabled} onChange={(e) => e.target.value && onChange(e.target.value)} />
  );
}

type SheetName = 'theme' | 'password' | 'logout' | 'profile' | null;

export function SettingsPage() {
  const { user, passwordRecovery, clearPasswordRecovery } = useAuth();
  const { settings, cycles, loading } = useCycleState();
  const update = useUpdateSettings();
  const theme = useThemePreference();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [themeDraft, setThemeDraft] = useState<ThemePreference>(theme);
  const [newPassword, setNewPassword] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  // Arrived from a password-reset email: open the new-password sheet.
  useEffect(() => {
    if (passwordRecovery) setSheet('password');
  }, [passwordRecovery]);

  if (loading || !settings) return <div className="splash"><Spinner /></div>;
  const s: UserSettings = settings;
  const patch = (p: UserSettingsUpdate) => update.mutate(p);
  const computed = computeAverages(cycles);
  const off = !s.notifications_enabled;
  const name = s.display_name || user?.email?.split('@')[0] || 'You';

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err);
    }
  };

  const changePassword = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await updatePassword(newPassword);
      setNewPassword('');
      clearPasswordRecovery();
      setSheet(null);
      setMessage('Password updated.');
    });
  };

  const download = () =>
    run(async () => {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `istree-export-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
    });

  const logout = () =>
    run(async () => {
      await disablePush().catch(() => undefined); // stop this device getting the old account's reminders
      await signOut();
    });

  const remove = () => {
    if (!confirm('Delete your account and all your data permanently? This cannot be undone.')) return;
    void run(async () => {
      await disablePush().catch(() => undefined);
      await deleteMyAccount();
    });
  };

  return (
    <div className="page">
      <TopBar title="Account" />

      <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', border: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => { setNameDraft(s.display_name ?? ''); setSheet('profile'); }}>
        <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
        <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
          <strong>{name}</strong>
          <span className="small faint" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
        </span>
        <EditIcon style={{ width: 20, height: 20, color: 'var(--text-3)' }} />
      </button>

      {message && <div className="alert alert--success">{message}</div>}
      <ErrorNote error={error ?? update.error} />

      <NotificationsCard />

      <span className="group-label">Reminders</span>
      <section className="card card--flush list">
        <ListRow icon={<BellIcon />} label="Send me reminders" hint="All your installed devices" trailing={<Toggle label="Send me reminders" checked={s.notifications_enabled} onChange={(v) => patch({ notifications_enabled: v })} />} />
        <ListRow icon={<SunMoonIcon />} label="Phase changes" hint="Morning note on a new phase" trailing={<Toggle label="Phase changes" checked={s.notify_phase_changes} disabled={off} onChange={(v) => patch({ notify_phase_changes: v })} />} />
        <ListRow icon={<DropIcon filled={false} />} label="Period heads-up" hint="2 days before + on the day" trailing={<Toggle label="Period heads-up" checked={s.notify_period_forecast} disabled={off} onChange={(v) => patch({ notify_period_forecast: v })} />} />
        <ListRow sub label="Morning reminders at" trailing={<TimeInput label="Morning reminders at" value={s.morning_time} disabled={off} onChange={(v) => patch({ morning_time: v })} />} />
        <ListRow icon={<EditIcon />} label="Daily check-in" hint="Skipped if already logged" trailing={<Toggle label="Daily check-in" checked={s.notify_daily_checkin} disabled={off} onChange={(v) => patch({ notify_daily_checkin: v })} />} />
        {s.notify_daily_checkin && <ListRow sub label="Check-in at" trailing={<TimeInput label="Check-in at" value={s.checkin_time} disabled={off} onChange={(v) => patch({ checkin_time: v })} />} />}
        <ListRow icon={<DropIcon />} label="Hydration" trailing={<Toggle label="Hydration" checked={s.notify_hydration} disabled={off} onChange={(v) => patch({ notify_hydration: v })} />} />
        {s.notify_hydration &&
          s.hydration_times.map((t, i) => (
            <ListRow
              key={i}
              sub label={`Water #${i + 1}`}
              trailing={
                <span className="row" style={{ gap: 4 }}>
                  <TimeInput label={`Water reminder ${i + 1}`} value={t} disabled={off} onChange={(v) => patch({ hydration_times: s.hydration_times.map((x, j) => (j === i ? v : x)) })} />
                  <button type="button" className="icon-btn" aria-label={`Remove water reminder ${i + 1}`} onClick={() => patch({ hydration_times: s.hydration_times.filter((_, j) => j !== i) })}>✕</button>
                </span>
              }
            />
          ))}
        {s.notify_hydration && s.hydration_times.length < 8 && (
          <ListRow sub label="+ Add water reminder" onClick={() => patch({ hydration_times: [...s.hydration_times, '12:00'] })} trailing={<span />} />
        )}
        <ListRow icon={<MoonIcon />} label="Wind-down for sleep" trailing={<Toggle label="Wind-down for sleep" checked={s.notify_sleep} disabled={off} onChange={(v) => patch({ notify_sleep: v })} />} />
        {s.notify_sleep && <ListRow sub label="Wind down at" trailing={<TimeInput label="Wind down at" value={s.sleep_time} disabled={off} onChange={(v) => patch({ sleep_time: v })} />} />}
        <ListRow
          icon={<ShieldIcon />}
          label="Quiet hours"
          hint="No reminders during this time"
          trailing={<Toggle label="Quiet hours" checked={!!s.quiet_hours_start} disabled={off} onChange={(v) => patch(v ? { quiet_hours_start: '22:30', quiet_hours_end: '07:30' } : { quiet_hours_start: null, quiet_hours_end: null })} />}
        />
        {s.quiet_hours_start && s.quiet_hours_end && (
          <>
            <ListRow sub label="From" trailing={<TimeInput label="Quiet from" value={s.quiet_hours_start} disabled={off} onChange={(v) => patch({ quiet_hours_start: v })} />} />
            <ListRow sub label="Until" trailing={<TimeInput label="Quiet until" value={s.quiet_hours_end} disabled={off} onChange={(v) => patch({ quiet_hours_end: v })} />} />
          </>
        )}
      </section>
      <p className="tiny faint" style={{ padding: '0 4px' }}>Times are in your timezone: {s.timezone}</p>

      <span className="group-label">Cycle</span>
      <section className="card card--flush list">
        <ListRow
          icon={<SlidersIcon />}
          label="Learn from my history"
          hint={computed.cycleLength ? `From your logs: ${computed.cycleLength}-day cycle, ${computed.periodLength ?? s.average_period_length}-day period` : 'Used once you log two full cycles'}
          trailing={<Toggle label="Learn from my history" checked={s.use_computed_averages} onChange={(v) => patch({ use_computed_averages: v })} />}
        />
        <ListRow sub label={s.use_computed_averages ? 'Fallback cycle length' : 'Cycle length'} trailing={<Stepper label="cycle length" value={s.average_cycle_length} min={15} max={60} format={(v) => `${v} d`} onChange={(v) => patch({ average_cycle_length: v })} />} />
        <ListRow sub label={s.use_computed_averages ? 'Fallback period length' : 'Period length'} trailing={<Stepper label="period length" value={s.average_period_length} min={1} max={15} format={(v) => `${v} d`} onChange={(v) => patch({ average_period_length: v })} />} />
      </section>

      <span className="group-label">App</span>
      <section className="card card--flush list">
        <ListRow icon={<SunMoonIcon />} label="App appearance" value={THEME_LABEL[theme]} onClick={() => { setThemeDraft(theme); setSheet('theme'); }} />
        {!isStandalone() && <ListRow icon={<PhoneIcon />} label="Install iStree" hint="Add to your home screen" to="/install" />}
      </section>

      <span className="group-label">Account & security</span>
      <section className="card card--flush list">
        <ListRow icon={<KeyIcon />} label="Change password" onClick={() => setSheet('password')} />
        <ListRow icon={<DownloadIcon />} label="Download my data" hint="Everything you've logged, as JSON" onClick={download} />
        <ListRow icon={<LogoutIcon />} label="Log out" danger onClick={() => setSheet('logout')} />
        <ListRow icon={<TrashIcon />} label="Delete account" hint="Permanently removes your account and data" danger onClick={remove} />
      </section>

      <p className="tiny faint center">
        iStree stores your data in your private account only. No analytics or ad SDKs ever see your health data. Predictions are estimates, not medical advice.
      </p>

      <Sheet open={sheet === 'theme'} onClose={() => setSheet(null)} title="Choose theme">
        <div role="radiogroup" aria-label="Theme">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <label key={t} className="radio-row">
              <input type="radio" name="theme" checked={themeDraft === t} onChange={() => setThemeDraft(t)} />
              {THEME_LABEL[t]}
            </label>
          ))}
        </div>
        <div className="sheet__actions">
          <button type="button" className="btn btn--soft" onClick={() => setSheet(null)}>Cancel</button>
          <button type="button" className="btn" onClick={() => { setThemePreference(themeDraft); setSheet(null); }}>OK</button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'password'} onClose={() => setSheet(null)} title={passwordRecovery ? 'Choose a new password' : 'Change password'}>
        <form className="stack" onSubmit={changePassword}>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" className="input" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button className="btn btn--block">Save new password</button>
        </form>
      </Sheet>

      <Sheet open={sheet === 'profile'} onClose={() => setSheet(null)} title="Personal info">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ display_name: nameDraft.trim() || null });
            setSheet(null);
          }}
        >
          <div className="field">
            <label htmlFor="display-name">What should we call you?</label>
            <input id="display-name" className="input" maxLength={60} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          </div>
          <div className="field">
            <span className="field-label">Email</span>
            <input className="input" value={user?.email ?? ''} disabled />
          </div>
          <button className="btn btn--block">Save</button>
        </form>
      </Sheet>

      <Sheet open={sheet === 'logout'} onClose={() => setSheet(null)} title="Log out">
        <p className="center bold">Sure you want to log out?</p>
        <div className="sheet__actions">
          <button type="button" className="btn btn--soft" onClick={() => setSheet(null)}>Cancel</button>
          <button type="button" className="btn" onClick={logout}>Yes, log out</button>
        </div>
      </Sheet>
    </div>
  );
}
