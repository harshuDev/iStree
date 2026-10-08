import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '../components/Icons';
import { InstallGuide } from '../components/InstallGuide';
import { NotificationsCard } from '../components/NotificationsCard';
import { WheelPicker } from '../components/WheelPicker';
import { ErrorNote } from '../components/ui';
import { useLogPeriodStart, useUpdateSettings } from '../hooks/queries';
import { addDays, fromDayNumber, type ISODate } from '../lib/cycle';
import { deviceTimeZone, formatMonth, today as getToday } from '../lib/dates';
import { canRequestPush, detectPlatform, isStandalone } from '../lib/pwa';

const STEPS = 5;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function OnboardingPage() {
  const navigate = useNavigate();
  const today = getToday();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [periodLength, setPeriodLength] = useState(5);
  const [cycleLength, setCycleLength] = useState(28);
  const [lastStart, setLastStart] = useState<ISODate | null>(null);
  const updateSettings = useUpdateSettings();
  const logStart = useLogPeriodStart();
  const needsInstall = detectPlatform() !== 'desktop' && !isStandalone();

  const saveAndContinue = async () => {
    await updateSettings.mutateAsync({
      display_name: name.trim() || null,
      average_cycle_length: cycleLength,
      average_period_length: periodLength,
      timezone: deviceTimeZone(),
    });
    if (lastStart) await logStart.mutateAsync(lastStart);
    setStep(5);
  };

  const finish = async () => {
    await updateSettings.mutateAsync({ onboarding_completed: true });
    navigate('/', { replace: true });
  };

  const next = () => (step === 4 ? void saveAndContinue() : step === 5 ? void finish() : setStep(step + 1));
  const busy = updateSettings.isPending || logStart.isPending;

  const title = [
    "What's your name?",
    'How long does your period usually last?',
    'How long does your cycle usually last?',
    'When did your last period start?',
    needsInstall ? 'Add iStree to your home screen' : 'Turn on gentle reminders',
  ][step - 1];

  return (
    <main className="app app--bare">
      <div className="page" style={{ minHeight: 'calc(100dvh - 40px)' }}>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="icon-btn" aria-label="Back" disabled={step === 1} onClick={() => setStep(step - 1)}>
            <ChevronLeft />
          </button>
          <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step}>
            <span style={{ width: `${(step / STEPS) * 100}%` }} />
          </div>
          <span className="small bold" style={{ minWidth: 36, textAlign: 'right' }}>{step} / {STEPS}</span>
        </div>

        <h1 className="center" style={{ fontSize: '1.5rem', padding: '8px 12px 0' }}>{title}</h1>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          {step === 1 && (
            <>
              <input className="input" style={{ textAlign: 'center', fontSize: '1.6rem', minHeight: 72 }} placeholder="Your name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <p className="center small faint">Optional — it's only used to greet you.</p>
            </>
          )}
          {step === 2 && <WheelPicker label="Period length" values={range(1, 15)} value={periodLength} onChange={setPeriodLength} unit="days" />}
          {step === 3 && (
            <>
              <WheelPicker label="Cycle length" values={range(15, 60)} value={cycleLength} onChange={setCycleLength} unit="days" />
              <p className="center small faint">Most cycles are 21–35 days. A rough guess is fine.</p>
            </>
          )}
          {step === 4 && (
            <>
              <MonthPicker today={today} value={lastStart} onChange={setLastStart} />
              <button type="button" className="chip" style={{ alignSelf: 'center' }} aria-pressed={lastStart === null} onClick={() => setLastStart(null)}>
                I don't remember
              </button>
            </>
          )}
          {step === 5 && (
            <>
              {needsInstall && <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}><InstallGuide /></div>}
              {canRequestPush() && <NotificationsCard compact />}
              {!needsInstall && !canRequestPush() && <p className="center muted">You're all set! 🌸</p>}
            </>
          )}
        </div>

        <ErrorNote error={updateSettings.error ?? logStart.error} />
        <button className="btn btn--block" onClick={next} disabled={busy}>
          {step === 4 ? 'Finish' : step === 5 ? (needsInstall ? "I'll do this later" : "Let's go") : 'Continue'}
        </button>
      </div>
    </main>
  );
}

/** One month at a time, last ~3 months selectable, Sunday-first. */
function MonthPicker({ today, value, onChange }: { today: ISODate; value: ISODate | null; onChange: (d: ISODate | null) => void }) {
  const [y, m] = today.split('-').map(Number);
  const [cursor, setCursor] = useState({ year: y, month: m - 1 });
  const minDate = addDays(today, -90);
  const first = Date.UTC(cursor.year, cursor.month, 1) / 86_400_000;
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const lead = new Date(first * 86_400_000).getUTCDay();
  const isCurrentMonth = cursor.year === y && cursor.month === m - 1;
  const canGoBack = fromDayNumber(first) > minDate;
  const shift = (d: number) => setCursor(({ year, month }) => ({ year: year + Math.floor((month + d) / 12), month: (((month + d) % 12) + 12) % 12 }));

  return (
    <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
      <div className="calendar__head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} disabled={!canGoBack} aria-label="Previous month"><ChevronLeft /></button>
        <h2>{formatMonth(cursor.year, cursor.month)}</h2>
        <button type="button" className="icon-btn" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Next month"><ChevronRight /></button>
      </div>
      <div className="calendar__grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="calendar__dow">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`p${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = fromDayNumber(first + i);
          const disabled = d > today || d < minDate;
          return (
            <button
              key={d}
              type="button"
              className={`day${d === value ? ' day--period-logged' : ''}`}
              disabled={disabled}
              style={disabled ? { opacity: 0.3 } : undefined}
              aria-pressed={d === value}
              onClick={() => onChange(d === value ? null : d)}
            >
              <span>{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
