import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChipGroup, ErrorNote, Spinner, Stepper, Switch } from '../components/ui';
import { useCycleState, useDailyLog, useSaveDailyLog } from '../hooks/queries';
import { ENERGY_LABELS, FLOW_OPTIONS, MOOD_OPTIONS, SYMPTOM_OPTIONS } from '../lib/constants';
import { addDays, phaseForDate, PHASE_LABEL, type ISODate } from '../lib/cycle';
import type { DailyLog, FlowIntensity } from '../lib/database.types';
import { formatDate } from '../lib/dates';
import { cancelLocalReminder, scheduleLocalReminder, useLocalReminders } from '../lib/localReminders';

interface FormState {
  flow_intensity: FlowIntensity | null;
  mood: string | null;
  symptoms: string[];
  water_intake: number;
  sleep_hours: number;
  energy_level: number | null;
  rested: boolean;
  notes: string;
}

const fromLog = (log: DailyLog | null | undefined): FormState => ({
  flow_intensity: log?.flow_intensity ?? null,
  mood: log?.mood ?? null,
  symptoms: log?.symptoms ?? [],
  water_intake: log?.water_intake ?? 0,
  sleep_hours: log?.sleep_hours != null ? Number(log.sleep_hours) : 7,
  energy_level: log?.energy_level ?? null,
  rested: log?.rested ?? false,
  notes: log?.notes ?? '',
});

export function CheckInPage() {
  const [params, setParams] = useSearchParams();
  const { today, cycles, settings, context } = useCycleState();
  const date: ISODate = params.get('date') && params.get('date')! <= today ? params.get('date')! : today;
  const { data: log, isLoading } = useDailyLog(date);
  const save = useSaveDailyLog();
  const [form, setForm] = useState<FormState>(() => fromLog(null));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading) setForm(fromLog(log));
    setSaved(false);
  }, [log, isLoading, date]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await save.mutateAsync({ date, ...form, notes: form.notes.trim() || null });
    setSaved(true);
  };

  const phase = settings ? phaseForDate(cycles, settings, date) : null;
  const goDay = (delta: number) => {
    const next = addDays(date, delta);
    if (next <= today) setParams(next === today ? {} : { date: next });
  };

  return (
    <form className="page" onSubmit={submit}>
      <header className="page-header">
        <div className="row row--between">
          <button type="button" className="btn btn--secondary btn--small" style={{ width: 44, height: 44, padding: 0 }} onClick={() => goDay(-1)} aria-label="Previous day">‹</button>
          <div className="center">
            <h1>{date === today ? 'Today' : formatDate(date, 'long')}</h1>
            {phase && <p className="small">{PHASE_LABEL[phase]} phase</p>}
          </div>
          <button type="button" className="btn btn--secondary btn--small" style={{ width: 44, height: 44, padding: 0 }} onClick={() => goDay(1)} disabled={date >= today} aria-label="Next day">›</button>
        </div>
      </header>

      {isLoading ? (
        <div className="center"><Spinner /></div>
      ) : (
        <>
          <section className="card">
            <h2>Flow</h2>
            <div className="segmented" role="group" aria-label="Flow intensity">
              {FLOW_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={form.flow_intensity === o.value} onClick={() => set('flow_intensity', form.flow_intensity === o.value ? null : o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Mood</h2>
            <ChipGroup label="Mood" options={MOOD_OPTIONS} value={form.mood ? [form.mood as (typeof MOOD_OPTIONS)[number]['value']] : []} onChange={(v) => set('mood', v[0] ?? null)} />
          </section>

          <section className="card">
            <h2>Symptoms</h2>
            <ChipGroup
              label="Symptoms"
              multiple
              options={SYMPTOM_OPTIONS}
              value={form.symptoms as (typeof SYMPTOM_OPTIONS)[number]['value'][]}
              onChange={(v) => set('symptoms', v)}
            />
          </section>

          <section className="card">
            <div className="row row--between">
              <div>
                <h2>Water</h2>
                <p className="small muted">Glasses (~250 ml)</p>
              </div>
              <Stepper label="glasses of water" value={form.water_intake} onChange={(v) => set('water_intake', v)} min={0} max={30} />
            </div>
            <div className="row row--between">
              <div>
                <h2>Sleep</h2>
                <p className="small muted">Last night</p>
              </div>
              <Stepper label="hours of sleep" value={form.sleep_hours} onChange={(v) => set('sleep_hours', v)} min={0} max={24} step={0.5} format={(v) => `${v} h`} />
            </div>
          </section>

          <section className="card">
            <h2>Energy & rest</h2>
            <div className="segmented" role="group" aria-label="Energy level">
              {ENERGY_LABELS.map((label, i) => (
                <button key={label} type="button" aria-pressed={form.energy_level === i + 1} onClick={() => set('energy_level', form.energy_level === i + 1 ? null : i + 1)}>
                  {label}
                </button>
              ))}
            </div>
            <Switch label="I took time to rest today" checked={form.rested} onChange={(v) => set('rested', v)} />
          </section>

          <section className="card">
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" className="input" maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything you want to remember…" />
            </div>
          </section>

          <ErrorNote error={save.error} />
          {saved && <div className="alert alert--success">Saved. Thank you for checking in 🌸</div>}
          <button className="btn btn--block" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : log ? 'Update check-in' : 'Save check-in'}
          </button>

          {date === today && <QuickReminders phase={context?.phase ?? 'follicular'} />}
        </>
      )}
    </form>
  );
}

function QuickReminders({ phase }: { phase: Parameters<typeof scheduleLocalReminder>[2] }) {
  const reminders = useLocalReminders();
  const allowed = 'Notification' in window && Notification.permission === 'granted';
  if (!allowed) return null;
  return (
    <section className="card">
      <h2>Nudge me later</h2>
      <p className="small muted">Works while iStree stays open in the background.</p>
      <div className="chips">
        <button type="button" className="chip" onClick={() => scheduleLocalReminder('water_nudge', 60, phase)}>💧 Water in 1 h</button>
        <button type="button" className="chip" onClick={() => scheduleLocalReminder('rest_nudge', 30, phase)}>🧘 Rest in 30 min</button>
        <button type="button" className="chip" onClick={() => scheduleLocalReminder('water_nudge', 120, phase)}>💧 Water in 2 h</button>
      </div>
      {reminders.map((r) => (
        <div key={r.id} className="row row--between small">
          <span>
            {r.kind === 'rest_nudge' ? 'Rest' : 'Water'} at{' '}
            {new Date(r.fireAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => cancelLocalReminder(r.id)}>Cancel</button>
        </div>
      ))}
    </section>
  );
}
