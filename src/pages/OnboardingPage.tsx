import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallGuide } from '../components/InstallGuide';
import { NotificationsCard } from '../components/NotificationsCard';
import { ErrorNote, Stepper } from '../components/ui';
import { useLogPeriodStart, useUpdateSettings } from '../hooks/queries';
import { addDays } from '../lib/cycle';
import { deviceTimeZone, today } from '../lib/dates';
import { canRequestPush, detectPlatform, isStandalone } from '../lib/pwa';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [lastStart, setLastStart] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const updateSettings = useUpdateSettings();
  const logStart = useLogPeriodStart();
  const todayDate = today();

  const saveBasics = async () => {
    await updateSettings.mutateAsync({
      average_cycle_length: cycleLength,
      average_period_length: periodLength,
      timezone: deviceTimeZone(),
    });
    if (lastStart) await logStart.mutateAsync(lastStart);
    setStep(2);
  };

  const finish = async () => {
    await updateSettings.mutateAsync({ onboarding_completed: true });
    navigate('/', { replace: true });
  };

  const needsInstall = detectPlatform() !== 'desktop' && !isStandalone();

  return (
    <main className="app app--bare">
      <div className="page">
        <header className="page-header">
          <span className="small muted">Step {step} of 2</span>
          <h1>{step === 1 ? 'Tell us about your cycle' : needsInstall ? 'Install iStree' : 'Turn on reminders'}</h1>
          <p>{step === 1 ? 'A rough idea is fine — predictions improve as you log.' : 'Phase-aware nudges for water, food, rest and sleep.'}</p>
        </header>

        {step === 1 ? (
          <>
            <div className="card">
              <div className="field">
                <label htmlFor="last-start">When did your last period start?</label>
                <input
                  id="last-start"
                  className="input"
                  type="date"
                  max={todayDate}
                  min={addDays(todayDate, -90)}
                  value={lastStart}
                  onChange={(e) => setLastStart(e.target.value)}
                />
                <span className="small muted">Leave empty if you don't remember.</span>
              </div>
              <div className="field">
                <span className="field-label">Typical cycle length</span>
                <Stepper label="cycle length" value={cycleLength} onChange={setCycleLength} min={15} max={60} format={(v) => `${v} days`} />
              </div>
              <div className="field">
                <span className="field-label">Typical period length</span>
                <Stepper label="period length" value={periodLength} onChange={setPeriodLength} min={1} max={15} format={(v) => `${v} days`} />
              </div>
            </div>
            <ErrorNote error={updateSettings.error ?? logStart.error} />
            <button className="btn btn--block" onClick={saveBasics} disabled={updateSettings.isPending || logStart.isPending}>
              Continue
            </button>
          </>
        ) : (
          <>
            {needsInstall && (
              <div className="card">
                <InstallGuide />
              </div>
            )}
            {canRequestPush() && <NotificationsCard compact />}
            <ErrorNote error={updateSettings.error} />
            <button className="btn btn--block" onClick={finish} disabled={updateSettings.isPending}>
              {needsInstall ? "I'll do this later" : 'Done'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
